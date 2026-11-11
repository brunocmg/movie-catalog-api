import { Injectable } from '@nestjs/common';
import { Prisma, TitleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { titleSelect, toResponse } from '../titles/titles.service';
import { PaginatedRecommendationsDto } from './dto/stats.dto';
import { scoreCandidates } from './recommendations.scoring';

// Candidates are scored in memory, so the pool is capped
const POOL_SIZE = 200;

const candidateSelect = {
  ...titleSelect,
  genres: {
    select: { genreId: true, genre: { select: { name: true } } },
    orderBy: { genre: { name: 'asc' } },
  },
} satisfies Prisma.TitleSelect;

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: number,
    pagination: PaginationDto,
    type?: TitleType,
  ): Promise<PaginatedRecommendationsDto> {
    const { limit = 10, offset = 0 } = pagination;
    const affinity = await this.affinity(userId);

    const rows = await this.prisma.title.findMany({
      where: {
        type,
        watchedBy: { none: { userId } },
        genres:
          affinity.size > 0
            ? { some: { genreId: { in: [...affinity.keys()] } } }
            : undefined,
      },
      orderBy: [{ ratingCount: 'desc' }, { id: 'asc' }],
      take: POOL_SIZE,
      select: candidateSelect,
    });

    const byId = new Map(rows.map((r) => [r.id, r]));
    const scored = scoreCandidates(
      rows.map((r) => ({
        id: r.id,
        year: r.year,
        ratingCount: r.ratingCount,
        ratingSum: r.ratingSum,
        genreIds: r.genres.map((g) => g.genreId),
      })),
      affinity,
    );

    const genreName = new Map(
      rows.flatMap((r) => r.genres.map((g) => [g.genreId, g.genre.name])),
    );
    return {
      data: scored.slice(offset, offset + limit).map((s) => ({
        title: toResponse(byId.get(s.id)!),
        score: s.score,
        because: s.matchedGenreIds.map((g) => genreName.get(g) as string),
      })),
      meta: { limit, offset, total: scored.length },
    };
  }

  /**
   * Genre weights from what the user did: watching counts 1, a favorite 2 and
   * a rating moves from -2 (score 0) to +2 (score 10) around the neutral 5.
   */
  private async affinity(userId: number): Promise<Map<number, number>> {
    const rows = await this.prisma.$queryRaw<
      { genre_id: number; affinity: number }[]
    >`
      WITH weights AS (
        SELECT title_id, 1.0::float8 AS weight
          FROM watched_titles WHERE user_id = ${userId}
        UNION ALL
        SELECT title_id, 2.0::float8 FROM favorites WHERE user_id = ${userId}
        UNION ALL
        SELECT title_id, (score - 5)::float8 / 2.5
          FROM ratings WHERE user_id = ${userId}
      )
      SELECT tg.genre_id, SUM(w.weight)::float8 AS affinity
      FROM weights w
      JOIN title_genres tg ON tg.title_id = w.title_id
      GROUP BY tg.genre_id
      HAVING SUM(w.weight) > 0`;

    return new Map(rows.map((r) => [r.genre_id, r.affinity]));
  }
}
