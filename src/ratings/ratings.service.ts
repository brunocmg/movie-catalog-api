import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TitleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { titleSelect, toResponse } from '../titles/titles.service';
import {
  MyRatingDto,
  PaginatedMyRatingsDto,
  PaginatedReviewsDto,
  RateTitleDto,
  RatingDto,
} from './dto/rating.dto';

const ratingSelect = {
  titleId: true,
  score: true,
  review: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RatingSelect;

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async rate(
    userId: number,
    titleId: number,
    dto: RateTitleDto,
  ): Promise<RatingDto> {
    const title = await this.prisma.title.findUnique({
      where: { id: titleId },
      select: { id: true },
    });
    if (!title) throw new NotFoundException('Title not found');

    const review = dto.review || null;
    // titles.rating_count/rating_sum are kept by a trigger on ratings
    return this.prisma.rating.upsert({
      where: { userId_titleId: { userId, titleId } },
      update: { score: dto.score, review },
      create: { userId, titleId, score: dto.score, review },
      select: ratingSelect,
    });
  }

  async remove(userId: number, titleId: number): Promise<void> {
    await this.prisma.rating.deleteMany({ where: { userId, titleId } });
  }

  async findMine(userId: number, titleId: number): Promise<RatingDto> {
    const rating = await this.prisma.rating.findUnique({
      where: { userId_titleId: { userId, titleId } },
      select: ratingSelect,
    });
    if (!rating) throw new NotFoundException('Title not rated');
    return rating;
  }

  async listMine(
    userId: number,
    pagination: PaginationDto,
    type?: TitleType,
  ): Promise<PaginatedMyRatingsDto> {
    const { limit = 10, offset = 0 } = pagination;
    const where: Prisma.RatingWhereInput = { userId, title: { type } };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.rating.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { titleId: 'desc' }],
        take: limit,
        skip: offset,
        select: { ...ratingSelect, title: { select: titleSelect } },
      }),
      this.prisma.rating.count({ where }),
    ]);

    return {
      data: rows.map(({ title, ...rating }): MyRatingDto => ({
        ...rating,
        title: toResponse(title),
      })),
      meta: { limit, offset, total },
    };
  }

  async listReviews(
    titleId: number,
    pagination: PaginationDto,
  ): Promise<PaginatedReviewsDto> {
    const { limit = 10, offset = 0 } = pagination;
    const exists = await this.prisma.title.findUnique({
      where: { id: titleId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Title not found');

    const where: Prisma.RatingWhereInput = {
      titleId,
      review: { not: null },
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.rating.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { userId: 'desc' }],
        take: limit,
        skip: offset,
        select: {
          score: true,
          review: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.rating.count({ where }),
    ]);

    return {
      data: rows.map((r) => ({ ...r, review: r.review as string })),
      meta: { limit, offset, total },
    };
  }
}
