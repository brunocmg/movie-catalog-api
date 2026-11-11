import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isPrismaKnownError, PrismaErrorCode } from '../prisma/prisma-errors';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PaginationDto } from '../common/dto/pagination.dto';
import { titleSelect, toResponse } from '../titles/titles.service';
import {
  CreateListDto,
  ListDto,
  PaginatedListItemsDto,
  PaginatedListsDto,
  UpdateListDto,
} from './dto/list.dto';

export const MAX_LISTS_PER_USER = 50;
export const MAX_ITEMS_PER_LIST = 500;

const listSelect = {
  id: true,
  name: true,
  description: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true } },
  _count: { select: { items: true } },
} satisfies Prisma.ListSelect;

type ListRow = Prisma.ListGetPayload<{ select: typeof listSelect }>;

const toList = ({ user, _count, ...list }: ListRow): ListDto => ({
  ...list,
  owner: user,
  itemCount: _count.items,
});

// A private list looks like a missing one to everybody but its owner
const readableBy = (viewer?: AuthenticatedUser): Prisma.ListWhereInput =>
  viewer
    ? { OR: [{ isPublic: true }, { userId: viewer.id }] }
    : { isPublic: true };

@Injectable()
export class ListsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateListDto): Promise<ListDto> {
    const lists = await this.prisma.list.count({ where: { userId } });
    if (lists >= MAX_LISTS_PER_USER) {
      throw new ConflictException(
        `You can have at most ${MAX_LISTS_PER_USER} lists`,
      );
    }

    try {
      const list = await this.prisma.list.create({
        data: {
          userId,
          name: dto.name,
          description: dto.description || null,
          isPublic: dto.isPublic,
        },
        select: listSelect,
      });
      return toList(list);
    } catch (err) {
      throw this.translate(err);
    }
  }

  listMine(
    userId: number,
    pagination: PaginationDto,
  ): Promise<PaginatedListsDto> {
    return this.page({ userId }, pagination);
  }

  listPublic(pagination: PaginationDto): Promise<PaginatedListsDto> {
    return this.page({ isPublic: true }, pagination);
  }

  async findOne(id: number, viewer?: AuthenticatedUser): Promise<ListDto> {
    const list = await this.prisma.list.findFirst({
      where: { id, ...readableBy(viewer) },
      select: listSelect,
    });
    if (!list) throw new NotFoundException('List not found');
    return toList(list);
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateListDto,
  ): Promise<ListDto> {
    try {
      const list = await this.prisma.list.update({
        where: { id, userId },
        data: {
          name: dto.name,
          description:
            dto.description === undefined ? undefined : dto.description || null,
          isPublic: dto.isPublic,
        },
        select: listSelect,
      });
      return toList(list);
    } catch (err) {
      throw this.translate(err);
    }
  }

  async remove(userId: number, id: number): Promise<void> {
    try {
      await this.prisma.list.delete({ where: { id, userId } });
    } catch (err) {
      throw this.translate(err);
    }
  }

  async listItems(
    id: number,
    pagination: PaginationDto,
    viewer?: AuthenticatedUser,
  ): Promise<PaginatedListItemsDto> {
    const { limit = 10, offset = 0 } = pagination;
    const readable = await this.prisma.list.findFirst({
      where: { id, ...readableBy(viewer) },
      select: { id: true },
    });
    if (!readable) throw new NotFoundException('List not found');

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.listItem.findMany({
        where: { listId: id },
        orderBy: [{ addedAt: 'asc' }, { titleId: 'asc' }],
        take: limit,
        skip: offset,
        select: { addedAt: true, title: { select: titleSelect } },
      }),
      this.prisma.listItem.count({ where: { listId: id } }),
    ]);

    return {
      data: rows.map((r) => ({
        addedAt: r.addedAt,
        title: toResponse(r.title),
      })),
      meta: { limit, offset, total },
    };
  }

  async addItem(
    userId: number,
    listId: number,
    titleId: number,
  ): Promise<void> {
    await this.assertOwner(userId, listId);

    const title = await this.prisma.title.findUnique({
      where: { id: titleId },
      select: { id: true },
    });
    if (!title) throw new NotFoundException('Title not found');

    const already = await this.prisma.listItem.findUnique({
      where: { listId_titleId: { listId, titleId } },
      select: { listId: true },
    });
    if (already) return;

    const items = await this.prisma.listItem.count({ where: { listId } });
    if (items >= MAX_ITEMS_PER_LIST) {
      throw new ConflictException(
        `A list can have at most ${MAX_ITEMS_PER_LIST} titles`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.listItem.upsert({
        where: { listId_titleId: { listId, titleId } },
        update: {},
        create: { listId, titleId },
      }),
      this.prisma.list.update({
        where: { id: listId },
        data: { updatedAt: new Date() },
      }),
    ]);
  }

  async removeItem(
    userId: number,
    listId: number,
    titleId: number,
  ): Promise<void> {
    await this.assertOwner(userId, listId);

    const { count } = await this.prisma.listItem.deleteMany({
      where: { listId, titleId },
    });
    if (count > 0) {
      await this.prisma.list.update({
        where: { id: listId },
        data: { updatedAt: new Date() },
      });
    }
  }

  private async page(
    where: Prisma.ListWhereInput,
    pagination: PaginationDto,
  ): Promise<PaginatedListsDto> {
    const { limit = 10, offset = 0 } = pagination;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.list.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
        select: listSelect,
      }),
      this.prisma.list.count({ where }),
    ]);
    return { data: rows.map(toList), meta: { limit, offset, total } };
  }

  private async assertOwner(userId: number, listId: number): Promise<void> {
    const list = await this.prisma.list.findFirst({
      where: { id: listId, userId },
      select: { id: true },
    });
    if (!list) throw new NotFoundException('List not found');
  }

  private translate(err: unknown): unknown {
    if (isPrismaKnownError(err, PrismaErrorCode.RecordNotFound)) {
      return new NotFoundException('List not found');
    }
    if (isPrismaKnownError(err, PrismaErrorCode.UniqueConstraint)) {
      return new ConflictException('You already have a list with this name');
    }
    return err;
  }
}
