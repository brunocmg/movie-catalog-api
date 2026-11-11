import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TitleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isPrismaKnownError, PrismaErrorCode } from '../prisma/prisma-errors';
import { slugify } from '../common/utils/slug';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateTitleDto } from './dto/create-title.dto';
import { UpdateTitleDto } from './dto/update-title.dto';
import { PaginatedTitlesDto, ResponseTitleDto } from './dto/response-title.dto';

const titleSelect = {
  id: true,
  type: true,
  name: true,
  year: true,
  director: true,
  synopsis: true,
  posterUrl: true,
  runtimeMinutes: true,
  createdAt: true,
  updatedAt: true,
  genres: {
    select: { genre: { select: { name: true } } },
    orderBy: { genre: { name: 'asc' } },
  },
} satisfies Prisma.TitleSelect;

type TitleRow = Prisma.TitleGetPayload<{ select: typeof titleSelect }>;

const toResponse = ({ genres, ...title }: TitleRow): ResponseTitleDto => ({
  ...title,
  genres: genres.map((g) => g.genre.name),
});

// one entry per slug, so "Drama" and "drama" do not collide
function uniqueGenres(names: string[]) {
  const bySlug = new Map<string, string>();
  for (const name of names) {
    const slug = slugify(name);
    if (slug && !bySlug.has(slug)) bySlug.set(slug, name);
  }
  return [...bySlug].map(([slug, name]) => ({ slug, name }));
}

const connectGenres = (names: string[]) =>
  uniqueGenres(names).map((g) => ({
    genre: { connectOrCreate: { where: { slug: g.slug }, create: g } },
  }));

const label = (type?: TitleType) =>
  type === TitleType.MOVIE
    ? 'Movie'
    : type === TitleType.SERIES
      ? 'Series'
      : 'Title';

@Injectable()
export class TitlesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    type: TitleType,
    dto: CreateTitleDto,
  ): Promise<ResponseTitleDto> {
    try {
      const title = await this.prisma.title.create({
        data: {
          type,
          name: dto.name,
          year: dto.year,
          director: dto.director,
          synopsis: dto.synopsis,
          posterUrl: dto.posterUrl,
          runtimeMinutes: dto.runtimeMinutes,
          genres: dto.genres && { create: connectGenres(dto.genres) },
        },
        select: titleSelect,
      });
      return toResponse(title);
    } catch (err) {
      throw this.translate(err, type);
    }
  }

  async findAll(
    pagination: PaginationDto,
    type?: TitleType,
  ): Promise<PaginatedTitlesDto> {
    const { limit = 10, offset = 0 } = pagination;
    const where: Prisma.TitleWhereInput = { type };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.title.findMany({
        where,
        orderBy: { id: 'asc' },
        take: limit,
        skip: offset,
        select: titleSelect,
      }),
      this.prisma.title.count({ where }),
    ]);

    return { data: rows.map(toResponse), meta: { limit, offset, total } };
  }

  async findOne(id: number, type?: TitleType): Promise<ResponseTitleDto> {
    const title = await this.prisma.title.findFirst({
      where: { id, type },
      select: titleSelect,
    });
    if (!title) throw new NotFoundException(`${label(type)} not found`);
    return toResponse(title);
  }

  async update(
    id: number,
    type: TitleType,
    dto: UpdateTitleDto,
  ): Promise<ResponseTitleDto> {
    try {
      const title = await this.prisma.title.update({
        where: { id, type },
        data: {
          name: dto.name,
          year: dto.year,
          director: dto.director,
          synopsis: dto.synopsis,
          posterUrl: dto.posterUrl,
          runtimeMinutes: dto.runtimeMinutes,
          genres: dto.genres && {
            deleteMany: {},
            create: connectGenres(dto.genres),
          },
        },
        select: titleSelect,
      });
      return toResponse(title);
    } catch (err) {
      throw this.translate(err, type);
    }
  }

  async remove(id: number, type: TitleType): Promise<void> {
    try {
      await this.prisma.title.delete({ where: { id, type } });
    } catch (err) {
      throw this.translate(err, type);
    }
  }

  private translate(err: unknown, type: TitleType): unknown {
    if (isPrismaKnownError(err, PrismaErrorCode.RecordNotFound)) {
      return new NotFoundException(`${label(type)} not found`);
    }
    if (isPrismaKnownError(err, PrismaErrorCode.UniqueConstraint)) {
      return new ConflictException(
        `A ${label(type).toLowerCase()} with this name and year already exists`,
      );
    }
    return err;
  }
}
