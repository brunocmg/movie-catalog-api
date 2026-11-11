import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatsDto } from './dto/stats.dto';

const TOP_GENRES = 5;

type CountsRow = { movies: number; series: number; episodes: number };
type MinutesRow = { minutes: number };

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: number): Promise<StatsDto> {
    const [counts, minutes, topGenres, ratings] = await Promise.all([
      this.prisma.$queryRaw<CountsRow[]>`
        SELECT
          (SELECT COUNT(*)::int FROM watched_titles wt
             JOIN titles t ON t.id = wt.title_id
             WHERE wt.user_id = ${userId} AND t.type = 'MOVIE') AS movies,
          (SELECT COUNT(*)::int FROM watched_titles wt
             JOIN titles t ON t.id = wt.title_id
             WHERE wt.user_id = ${userId} AND t.type = 'SERIES') AS series,
          (SELECT COUNT(*)::int FROM watched_episodes
             WHERE user_id = ${userId}) AS episodes`,
      this.prisma.$queryRaw<MinutesRow[]>`
        SELECT (
          COALESCE((SELECT SUM(t.runtime_minutes) FROM watched_titles wt
            JOIN titles t ON t.id = wt.title_id
            WHERE wt.user_id = ${userId} AND t.type = 'MOVIE'), 0)
          +
          COALESCE((SELECT SUM(COALESCE(e.runtime_minutes, t.runtime_minutes, 0))
            FROM watched_episodes we
            JOIN episodes e ON e.id = we.episode_id
            JOIN seasons s ON s.id = e.season_id
            JOIN titles t ON t.id = s.title_id
            WHERE we.user_id = ${userId}), 0)
        )::int AS minutes`,
      this.prisma.$queryRaw<{ name: string; slug: string; count: number }[]>`
        SELECT g.name, g.slug, COUNT(*)::int AS count
        FROM watched_titles wt
        JOIN title_genres tg ON tg.title_id = wt.title_id
        JOIN genres g ON g.id = tg.genre_id
        WHERE wt.user_id = ${userId}
        GROUP BY g.id
        ORDER BY count DESC, g.name ASC
        LIMIT ${TOP_GENRES}`,
      this.prisma.rating.aggregate({
        where: { userId },
        _count: true,
        _avg: { score: true },
      }),
    ]);

    const total = minutes[0]?.minutes ?? 0;
    return {
      watched: counts[0],
      watchTime: { minutes: total, hours: Math.round((total / 60) * 10) / 10 },
      topGenres,
      ratings: {
        count: ratings._count,
        average:
          ratings._avg.score === null
            ? null
            : Math.round(ratings._avg.score * 10) / 10,
      },
    };
  }
}
