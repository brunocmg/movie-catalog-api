import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma, TitleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isPrismaKnownError, PrismaErrorCode } from '../prisma/prisma-errors';
import { connectGenres, TitlesService } from '../titles/titles.service';
import { ResponseTitleDto } from '../titles/dto/response-title.dto';
import { TmdbClient } from './tmdb.client';
import { TmdbSearchResult, TmdbSeason, TmdbTitle } from './tmdb.types';

const MIN_YEAR = 1888;
const MAX_YEAR = 2100;
const TX_TIMEOUT_MS = 60_000;

@Injectable()
export class TmdbImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbClient,
    private readonly titles: TitlesService,
  ) {}

  search(type: TitleType, query: string): Promise<TmdbSearchResult[]> {
    return this.tmdb.search(type, query);
  }

  async import(type: TitleType, tmdbId: number): Promise<ResponseTitleDto> {
    const data = await this.tmdb.getTitle(type, tmdbId);
    if (data.year === null || data.year < MIN_YEAR || data.year > MAX_YEAR) {
      throw new BadRequestException('TMDB title has no valid release year');
    }
    if (!data.name) throw new BadRequestException('TMDB title has no name');

    try {
      const id = await this.prisma.$transaction(
        (tx) => this.save(tx, data, data.year as number),
        { timeout: TX_TIMEOUT_MS },
      );
      return await this.titles.findOne(id, type);
    } catch (err) {
      if (isPrismaKnownError(err, PrismaErrorCode.UniqueConstraint)) {
        throw new ConflictException(
          'Another title with this name and year already exists',
        );
      }
      throw err;
    }
  }

  private async save(
    tx: Prisma.TransactionClient,
    data: TmdbTitle,
    year: number,
  ): Promise<number> {
    const { type, tmdbId } = data;
    const existing =
      (await tx.title.findFirst({
        where: { type, tmdbId },
        select: { id: true },
      })) ??
      (await tx.title.findFirst({
        where: { type, name: data.name, year },
        select: { id: true },
      }));

    const fields = {
      name: data.name,
      year,
      director: data.director,
      synopsis: data.overview,
      posterUrl: data.posterUrl,
      runtimeMinutes: data.runtimeMinutes,
      tmdbId,
      genres: { deleteMany: {}, create: connectGenres(data.genres) },
      cast: { deleteMany: {}, create: data.cast },
    };

    const select = { id: true } as const;
    const title = existing
      ? await tx.title.update({
          where: { id: existing.id },
          data: fields,
          select,
        })
      : await tx.title.create({
          data: {
            ...fields,
            type,
            genres: { create: fields.genres.create },
            cast: { create: data.cast },
          },
          select,
        });

    for (const season of data.seasons) {
      await this.saveSeason(tx, title.id, season);
    }
    return title.id;
  }

  private async saveSeason(
    tx: Prisma.TransactionClient,
    titleId: number,
    season: TmdbSeason,
  ): Promise<void> {
    const { id: seasonId } = await tx.season.upsert({
      where: { titleId_number: { titleId, number: season.number } },
      update: { name: season.name },
      create: { titleId, number: season.number, name: season.name },
      select: { id: true },
    });

    // episodes are updated in place so watch history on them survives a re-import
    const current = new Map(
      (
        await tx.episode.findMany({
          where: { seasonId },
          select: { id: true, number: true, name: true, runtimeMinutes: true },
        })
      ).map((e) => [e.number, e]),
    );

    const missing = season.episodes.filter((e) => !current.has(e.number));
    await tx.episode.createMany({
      data: missing.map((e) => ({ seasonId, ...e })),
    });

    for (const e of season.episodes) {
      const old = current.get(e.number);
      if (
        old &&
        (old.name !== e.name || old.runtimeMinutes !== e.runtimeMinutes)
      ) {
        await tx.episode.update({
          where: { id: old.id },
          data: { name: e.name, runtimeMinutes: e.runtimeMinutes },
        });
      }
    }
  }
}
