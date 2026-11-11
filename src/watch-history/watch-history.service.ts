import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TitleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { titleSelect, toResponse } from '../titles/titles.service';
import {
  PaginatedWatchedDto,
  ProgressDto,
  WatchedEpisodeDto,
  WatchedTitleDto,
} from './dto/watched.dto';

type ProgressRow = { title_id: number; total: number; watched: number };

@Injectable()
export class WatchHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: number,
    pagination: PaginationDto,
    type?: TitleType,
  ): Promise<PaginatedWatchedDto> {
    const { limit = 10, offset = 0 } = pagination;
    const where: Prisma.WatchedTitleWhereInput = { userId, title: { type } };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.watchedTitle.findMany({
        where,
        orderBy: [{ watchedAt: 'desc' }, { titleId: 'desc' }],
        take: limit,
        skip: offset,
        select: { watchedAt: true, title: { select: titleSelect } },
      }),
      this.prisma.watchedTitle.count({ where }),
    ]);

    const progress = await this.progressFor(
      userId,
      rows
        .filter((r) => r.title.type === TitleType.SERIES)
        .map((r) => r.title.id),
    );

    return {
      data: rows.map((r) => ({
        title: toResponse(r.title),
        watchedAt: r.watchedAt,
        progress:
          r.title.type === TitleType.SERIES
            ? (progress.get(r.title.id) ?? { watched: 0, total: 0 })
            : null,
      })),
      meta: { limit, offset, total },
    };
  }

  async findOne(userId: number, titleId: number): Promise<WatchedTitleDto> {
    const row = await this.prisma.watchedTitle.findUnique({
      where: { userId_titleId: { userId, titleId } },
      select: { watchedAt: true, title: { select: titleSelect } },
    });
    if (!row) throw new NotFoundException('Title not marked as watched');

    const isSeries = row.title.type === TitleType.SERIES;
    const progress = isSeries
      ? ((await this.progressFor(userId, [titleId])).get(titleId) ?? {
          watched: 0,
          total: 0,
        })
      : null;
    return { title: toResponse(row.title), watchedAt: row.watchedAt, progress };
  }

  async markTitle(userId: number, titleId: number): Promise<void> {
    const title = await this.prisma.title.findUnique({
      where: { id: titleId },
      select: { type: true },
    });
    if (!title) throw new NotFoundException('Title not found');

    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.watchedTitle.upsert({
        where: { userId_titleId: { userId, titleId } },
        update: {},
        create: { userId, titleId },
      }),
      this.prisma.watchlistItem.deleteMany({ where: { userId, titleId } }),
    ];
    if (title.type === TitleType.SERIES) {
      ops.push(
        this.prisma.$executeRaw`
          INSERT INTO watched_episodes (user_id, episode_id)
          SELECT ${userId}, e.id FROM episodes e
          JOIN seasons s ON s.id = e.season_id
          WHERE s.title_id = ${titleId}
          ON CONFLICT DO NOTHING`,
      );
    }
    await this.prisma.$transaction(ops);
  }

  async unmarkTitle(userId: number, titleId: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.watchedEpisode.deleteMany({
        where: { userId, episode: { season: { titleId } } },
      }),
      this.prisma.watchedTitle.deleteMany({ where: { userId, titleId } }),
    ]);
  }

  async markEpisode(userId: number, episodeId: number): Promise<void> {
    const titleId = await this.seriesOf(episodeId);
    await this.prisma.$transaction([
      this.prisma.watchedEpisode.upsert({
        where: { userId_episodeId: { userId, episodeId } },
        update: {},
        create: { userId, episodeId },
      }),
      this.prisma.watchedTitle.upsert({
        where: { userId_titleId: { userId, titleId } },
        update: {},
        create: { userId, titleId },
      }),
      this.prisma.watchlistItem.deleteMany({ where: { userId, titleId } }),
    ]);
  }

  async unmarkEpisode(userId: number, episodeId: number): Promise<void> {
    const titleId = await this.seriesOf(episodeId);
    await this.prisma.$transaction(async (tx) => {
      await tx.watchedEpisode.deleteMany({ where: { userId, episodeId } });
      const remaining = await tx.watchedEpisode.count({
        where: { userId, episode: { season: { titleId } } },
      });
      if (remaining === 0) {
        await tx.watchedTitle.deleteMany({ where: { userId, titleId } });
      }
    });
  }

  async listEpisodes(
    userId: number,
    titleId: number,
  ): Promise<WatchedEpisodeDto[]> {
    const series = await this.prisma.title.findFirst({
      where: { id: titleId, type: TitleType.SERIES },
      select: { id: true },
    });
    if (!series) throw new NotFoundException('Series not found');

    const episodes = await this.prisma.episode.findMany({
      where: { season: { titleId } },
      orderBy: [{ season: { number: 'asc' } }, { number: 'asc' }],
      select: {
        id: true,
        number: true,
        name: true,
        season: { select: { number: true } },
        watchedEpisodes: { where: { userId }, select: { userId: true } },
      },
    });
    return episodes.map((e) => ({
      id: e.id,
      seasonNumber: e.season.number,
      number: e.number,
      name: e.name,
      watched: e.watchedEpisodes.length > 0,
    }));
  }

  private async seriesOf(episodeId: number): Promise<number> {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      select: { season: { select: { titleId: true } } },
    });
    if (!episode) throw new NotFoundException('Episode not found');
    return episode.season.titleId;
  }

  private async progressFor(
    userId: number,
    titleIds: number[],
  ): Promise<Map<number, ProgressDto>> {
    if (titleIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<ProgressRow[]>`
      SELECT s.title_id,
             COUNT(e.id)::int AS total,
             COUNT(we.episode_id)::int AS watched
      FROM seasons s
      JOIN episodes e ON e.season_id = s.id
      LEFT JOIN watched_episodes we
        ON we.episode_id = e.id AND we.user_id = ${userId}
      WHERE s.title_id IN (${Prisma.join(titleIds)})
      GROUP BY s.title_id`;
    return new Map(
      rows.map((r) => [r.title_id, { watched: r.watched, total: r.total }]),
    );
  }
}
