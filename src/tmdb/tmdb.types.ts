import { TitleType } from '@prisma/client';

export interface TmdbSearchResult {
  tmdbId: number;
  type: TitleType;
  name: string;
  year: number | null;
  overview: string | null;
  posterUrl: string | null;
}

export interface TmdbEpisode {
  number: number;
  name: string;
  runtimeMinutes: number | null;
}

export interface TmdbSeason {
  number: number;
  name: string | null;
  episodes: TmdbEpisode[];
}

export interface TmdbCastMember {
  name: string;
  character: string | null;
  position: number;
  profileUrl: string | null;
}

export interface TmdbTitle extends TmdbSearchResult {
  runtimeMinutes: number | null;
  director: string | null;
  genres: string[];
  cast: TmdbCastMember[];
  seasons: TmdbSeason[];
}
