import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TitleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { titleSelect, toResponse } from '../titles/titles.service';
import { PaginatedFavoritesDto } from './dto/favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: number,
    pagination: PaginationDto,
    type?: TitleType,
  ): Promise<PaginatedFavoritesDto> {
    const { limit = 10, offset = 0 } = pagination;
    const where: Prisma.FavoriteWhereInput = { userId, title: { type } };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.favorite.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { titleId: 'desc' }],
        take: limit,
        skip: offset,
        select: { createdAt: true, title: { select: titleSelect } },
      }),
      this.prisma.favorite.count({ where }),
    ]);

    return {
      data: rows.map((r) => ({
        title: toResponse(r.title),
        favoritedAt: r.createdAt,
      })),
      meta: { limit, offset, total },
    };
  }

  async add(userId: number, titleId: number): Promise<void> {
    const title = await this.prisma.title.findUnique({
      where: { id: titleId },
      select: { id: true },
    });
    if (!title) throw new NotFoundException('Title not found');

    await this.prisma.favorite.upsert({
      where: { userId_titleId: { userId, titleId } },
      update: {},
      create: { userId, titleId },
    });
  }

  async remove(userId: number, titleId: number): Promise<void> {
    await this.prisma.favorite.deleteMany({ where: { userId, titleId } });
  }
}
