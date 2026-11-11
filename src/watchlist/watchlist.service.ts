import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Priority, TitleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { titleSelect, toResponse } from '../titles/titles.service';
import { PaginatedWatchlistDto } from './dto/watchlist.dto';

@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: number,
    pagination: PaginationDto,
    type?: TitleType,
  ): Promise<PaginatedWatchlistDto> {
    const { limit = 10, offset = 0 } = pagination;
    const where: Prisma.WatchlistItemWhereInput = { userId, title: { type } };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.watchlistItem.findMany({
        where,
        orderBy: [
          { priority: { sort: 'desc', nulls: 'last' } },
          { addedAt: 'desc' },
          { titleId: 'desc' },
        ],
        take: limit,
        skip: offset,
        select: {
          priority: true,
          addedAt: true,
          title: { select: titleSelect },
        },
      }),
      this.prisma.watchlistItem.count({ where }),
    ]);

    return {
      data: rows.map(({ title, ...item }) => ({
        ...item,
        title: toResponse(title),
      })),
      meta: { limit, offset, total },
    };
  }

  async add(
    userId: number,
    titleId: number,
    priority?: Priority,
  ): Promise<void> {
    const title = await this.prisma.title.findUnique({
      where: { id: titleId },
      select: { id: true },
    });
    if (!title) throw new NotFoundException('Title not found');

    await this.prisma.watchlistItem.upsert({
      where: { userId_titleId: { userId, titleId } },
      update: { priority },
      create: { userId, titleId, priority },
    });
  }

  async remove(userId: number, titleId: number): Promise<void> {
    await this.prisma.watchlistItem.deleteMany({ where: { userId, titleId } });
  }
}
