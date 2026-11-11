import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TitleType } from '@prisma/client';
import {
  TmdbCastMember,
  TmdbSearchResult,
  TmdbSeason,
  TmdbTitle,
} from './tmdb.types';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p';
const LANGUAGE = 'en-US';
const TIMEOUT_MS = 10_000;
const MAX_CAST = 20;
const MAX_RUNTIME = 1000;

interface RawGenre {
  name: string;
}
interface RawCast {
  name: string;
  character?: string;
  order?: number;
  profile_path?: string | null;
}
interface RawCredits {
  cast?: RawCast[];
  crew?: { job: string; name: string }[];
}
interface RawSearchItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string | null;
}
interface RawDetails extends RawSearchItem {
  runtime?: number | null;
  episode_run_time?: number[];
  genres?: RawGenre[];
  credits?: RawCredits;
  created_by?: { name: string }[];
  seasons?: { season_number: number; name?: string }[];
}
interface RawSeason {
  episodes?: {
    episode_number: number;
    name?: string;
    runtime?: number | null;
  }[];
}

const poster = (path?: string | null) =>
  path ? `${IMAGE_URL}/w500${path}` : null;

const yearOf = (date?: string) => {
  const year = Number(date?.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
};

const runtimeOf = (minutes?: number | null) =>
  minutes && minutes > 0 ? Math.min(minutes, MAX_RUNTIME) : null;

const clean = (value?: string) => value?.trim() || null;

@Injectable()
export class TmdbClient {
  constructor(private readonly config: ConfigService) {}

  async search(type: TitleType, query: string): Promise<TmdbSearchResult[]> {
    const kind = type === TitleType.MOVIE ? 'movie' : 'tv';
    const data = await this.get<{ results?: RawSearchItem[] }>(
      `/search/${kind}`,
      { query, include_adult: 'false' },
    );
    return (data.results ?? []).map((r) => this.toSearchResult(type, r));
  }

  async getTitle(type: TitleType, tmdbId: number): Promise<TmdbTitle> {
    const kind = type === TitleType.MOVIE ? 'movie' : 'tv';
    const raw = await this.get<RawDetails>(`/${kind}/${tmdbId}`, {
      append_to_response: 'credits',
    });

    const director =
      type === TitleType.MOVIE
        ? (raw.credits?.crew?.find((c) => c.job === 'Director')?.name ?? null)
        : clean(raw.created_by?.map((c) => c.name).join(', '));

    return {
      ...this.toSearchResult(type, raw),
      runtimeMinutes: runtimeOf(
        type === TitleType.MOVIE ? raw.runtime : raw.episode_run_time?.[0],
      ),
      director: director?.slice(0, 255) ?? null,
      genres: (raw.genres ?? []).map((g) => g.name),
      cast: this.toCast(raw.credits?.cast),
      seasons:
        type === TitleType.SERIES
          ? await this.getSeasons(tmdbId, raw.seasons ?? [])
          : [],
    };
  }

  private toSearchResult(type: TitleType, r: RawSearchItem): TmdbSearchResult {
    return {
      tmdbId: r.id,
      type,
      name: (r.title ?? r.name ?? '').trim(),
      year: yearOf(r.release_date ?? r.first_air_date),
      overview: clean(r.overview),
      posterUrl: poster(r.poster_path),
    };
  }

  private toCast(cast: RawCast[] = []): TmdbCastMember[] {
    return cast.slice(0, MAX_CAST).map((c, i) => ({
      name: c.name,
      character: clean(c.character),
      position: c.order ?? i,
      profileUrl: c.profile_path ? `${IMAGE_URL}/w185${c.profile_path}` : null,
    }));
  }

  private async getSeasons(
    tmdbId: number,
    seasons: { season_number: number; name?: string }[],
  ): Promise<TmdbSeason[]> {
    const result: TmdbSeason[] = [];
    for (const s of seasons) {
      const raw = await this.get<RawSeason>(
        `/tv/${tmdbId}/season/${s.season_number}`,
      );
      result.push({
        number: s.season_number,
        name: clean(s.name),
        episodes: (raw.episodes ?? []).map((e) => ({
          number: e.episode_number,
          name: clean(e.name) ?? `Episode ${e.episode_number}`,
          runtimeMinutes: runtimeOf(e.runtime),
        })),
      });
    }
    return result;
  }

  private async get<T>(
    path: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    const token = this.config.get<string>('TMDB_API_TOKEN');
    if (!token) {
      throw new ServiceUnavailableException(
        'TMDB integration is not configured',
      );
    }

    const url = new URL(BASE_URL + path);
    url.search = new URLSearchParams({
      language: LANGUAGE,
      ...params,
    }).toString();

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new BadGatewayException('Could not reach TMDB');
    }

    if (res.status === 404) throw new NotFoundException('Not found on TMDB');
    if (!res.ok) {
      throw new BadGatewayException(`TMDB responded with ${res.status}`);
    }
    return (await res.json()) as T;
  }
}
