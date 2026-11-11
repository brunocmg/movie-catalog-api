import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TitleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isPrismaKnownError, PrismaErrorCode } from '../prisma/prisma-errors';
import { CreateSeasonDto, UpdateSeasonDto } from './dto/create-season.dto';
import { CreateEpisodeDto, UpdateEpisodeDto } from './dto/create-episode.dto';
import {
  ResponseEpisodeDto,
  ResponseSeasonDto,
} from './dto/response-season.dto';

const seasonSelect = {
  id: true,
  titleId: true,
  number: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { episodes: true } },
} satisfies Prisma.SeasonSelect;

const episodeSelect = {
  id: true,
  seasonId: true,
  number: true,
  name: true,
  runtimeMinutes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EpisodeSelect;

type SeasonRow = Prisma.SeasonGetPayload<{ select: typeof seasonSelect }>;

const toSeason = ({ _count, ...season }: SeasonRow): ResponseSeasonDto => ({
  ...season,
  episodeCount: _count.episodes,
});

@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSeasons(seriesId: number): Promise<ResponseSeasonDto[]> {
    await this.assertSeries(seriesId);
    const rows = await this.prisma.season.findMany({
      where: { titleId: seriesId },
      orderBy: { number: 'asc' },
      select: seasonSelect,
    });
    return rows.map(toSeason);
  }

  async createSeason(
    seriesId: number,
    dto: CreateSeasonDto,
  ): Promise<ResponseSeasonDto> {
    await this.assertSeries(seriesId);
    try {
      const season = await this.prisma.season.create({
        data: { titleId: seriesId, number: dto.number, name: dto.name },
        select: seasonSelect,
      });
      return toSeason(season);
    } catch (err) {
      throw this.translate(err, 'Season');
    }
  }

  async findSeason(id: number): Promise<ResponseSeasonDto> {
    const season = await this.prisma.season.findUnique({
      where: { id },
      select: seasonSelect,
    });
    if (!season) throw new NotFoundException('Season not found');
    return toSeason(season);
  }

  async updateSeason(
    id: number,
    dto: UpdateSeasonDto,
  ): Promise<ResponseSeasonDto> {
    try {
      const season = await this.prisma.season.update({
        where: { id },
        data: { number: dto.number, name: dto.name },
        select: seasonSelect,
      });
      return toSeason(season);
    } catch (err) {
      throw this.translate(err, 'Season');
    }
  }

  async removeSeason(id: number): Promise<void> {
    try {
      await this.prisma.season.delete({ where: { id } });
    } catch (err) {
      throw this.translate(err, 'Season');
    }
  }

  async listEpisodes(seasonId: number): Promise<ResponseEpisodeDto[]> {
    await this.assertSeason(seasonId);
    return this.prisma.episode.findMany({
      where: { seasonId },
      orderBy: { number: 'asc' },
      select: episodeSelect,
    });
  }

  async createEpisode(
    seasonId: number,
    dto: CreateEpisodeDto,
  ): Promise<ResponseEpisodeDto> {
    await this.assertSeason(seasonId);
    try {
      return await this.prisma.episode.create({
        data: { seasonId, ...dto },
        select: episodeSelect,
      });
    } catch (err) {
      throw this.translate(err, 'Episode');
    }
  }

  async findEpisode(id: number): Promise<ResponseEpisodeDto> {
    const episode = await this.prisma.episode.findUnique({
      where: { id },
      select: episodeSelect,
    });
    if (!episode) throw new NotFoundException('Episode not found');
    return episode;
  }

  async updateEpisode(
    id: number,
    dto: UpdateEpisodeDto,
  ): Promise<ResponseEpisodeDto> {
    try {
      return await this.prisma.episode.update({
        where: { id },
        data: dto,
        select: episodeSelect,
      });
    } catch (err) {
      throw this.translate(err, 'Episode');
    }
  }

  async removeEpisode(id: number): Promise<void> {
    try {
      await this.prisma.episode.delete({ where: { id } });
    } catch (err) {
      throw this.translate(err, 'Episode');
    }
  }

  private async assertSeries(id: number) {
    const series = await this.prisma.title.findFirst({
      where: { id, type: TitleType.SERIES },
      select: { id: true },
    });
    if (!series) throw new NotFoundException('Series not found');
  }

  private async assertSeason(id: number) {
    const season = await this.prisma.season.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!season) throw new NotFoundException('Season not found');
  }

  private translate(err: unknown, entity: 'Season' | 'Episode'): unknown {
    if (isPrismaKnownError(err, PrismaErrorCode.RecordNotFound)) {
      return new NotFoundException(`${entity} not found`);
    }
    if (isPrismaKnownError(err, PrismaErrorCode.UniqueConstraint)) {
      return new ConflictException(`${entity} number already exists`);
    }
    return err;
  }
}
