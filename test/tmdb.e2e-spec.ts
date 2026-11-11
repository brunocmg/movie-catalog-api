import { INestApplication, NotFoundException } from '@nestjs/common';
import { TitleType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { TmdbClient } from '../src/tmdb/tmdb.client';
import { TmdbTitle } from '../src/tmdb/tmdb.types';
import {
  createTestApp,
  registerAdminAndLogin,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app';

const fightClub: TmdbTitle = {
  tmdbId: 550,
  type: TitleType.MOVIE,
  name: 'Fight Club',
  year: 1999,
  overview: 'An insomniac office worker...',
  posterUrl: 'https://image.tmdb.org/t/p/w500/fc.jpg',
  runtimeMinutes: 139,
  director: 'David Fincher',
  genres: ['Drama', 'Thriller'],
  cast: [
    { name: 'Brad Pitt', character: 'Tyler', position: 0, profileUrl: null },
    { name: 'Edward Norton', character: null, position: 1, profileUrl: null },
  ],
  seasons: [],
};

const dark = (episodeName = 'Secrets'): TmdbTitle => ({
  tmdbId: 550,
  type: TitleType.SERIES,
  name: 'Dark',
  year: 2017,
  overview: null,
  posterUrl: null,
  runtimeMinutes: 55,
  director: 'Baran bo Odar',
  genres: ['Sci-Fi'],
  cast: [],
  seasons: [
    {
      number: 1,
      name: 'Season 1',
      episodes: [
        { number: 1, name: episodeName, runtimeMinutes: 51 },
        { number: 2, name: 'Lies', runtimeMinutes: null },
      ],
    },
  ],
});

describe('TMDB import (e2e)', () => {
  let app: INestApplication<App>;
  let admin: string;
  let user: string;
  let catalog: Record<string, TmdbTitle>;

  const tmdb = {
    search: jest.fn(),
    getTitle: jest.fn((type: TitleType, id: number) => {
      const found = catalog[`${type}:${id}`];
      if (!found) throw new NotFoundException('Not found on TMDB');
      return Promise.resolve(found);
    }),
  };
  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const importTitle = (body: object, token = admin) =>
    http().post('/tmdb/import').set(as(token)).send(body);

  beforeAll(async () => {
    app = await createTestApp((b) =>
      b.overrideProvider(TmdbClient).useValue(tmdb),
    );
  });

  beforeEach(async () => {
    await resetDatabase(app);
    ({ token: admin } = await registerAdminAndLogin(app));
    ({ token: user } = await registerAndLogin(app, {
      name: 'Joao',
      email: 'joao@email.com',
      password: '123456',
    }));
    catalog = {
      'MOVIE:550': fightClub,
      'SERIES:550': dark(),
    };
  });

  afterAll(async () => {
    await app.close();
  });

  it('is admin only', async () => {
    await http().post('/tmdb/import').send({}).expect(401);
    await importTitle({ type: 'MOVIE', tmdbId: 550 }, user).expect(403);
    await http().get('/tmdb/search?q=x&type=MOVIE').set(as(user)).expect(403);
  });

  it('imports a movie with genres, director and cast', async () => {
    const res = await importTitle({ type: 'MOVIE', tmdbId: 550 }).expect(201);

    expect(res.body).toMatchObject({
      type: 'MOVIE',
      name: 'Fight Club',
      year: 1999,
      director: 'David Fincher',
      runtimeMinutes: 139,
      genres: ['Drama', 'Thriller'],
    });

    const id = (res.body as { id: number }).id;
    const cast = await http().get(`/titles/${id}/cast`).expect(200);
    expect((cast.body as { name: string }[]).map((c) => c.name)).toEqual([
      'Brad Pitt',
      'Edward Norton',
    ]);
    await http().get('/titles/999/cast').expect(404);
  });

  it('imports a series with its seasons and episodes', async () => {
    const res = await importTitle({ type: 'SERIES', tmdbId: 550 }).expect(201);
    const id = (res.body as { id: number }).id;

    const seasons = (await http().get(`/series/${id}/seasons`).expect(200))
      .body as { id: number; episodeCount: number }[];
    expect(seasons).toHaveLength(1);
    expect(seasons[0].episodeCount).toBe(2);
  });

  it('keeps a movie and a series with the same TMDB id apart', async () => {
    await importTitle({ type: 'MOVIE', tmdbId: 550 }).expect(201);
    await importTitle({ type: 'SERIES', tmdbId: 550 }).expect(201);

    expect((await http().get('/titles').expect(200)).body).toMatchObject({
      meta: { total: 2 },
    });
  });

  it('refreshes on re-import without duplicating or losing watch history', async () => {
    const first = await importTitle({ type: 'SERIES', tmdbId: 550 }).expect(
      201,
    );
    const id = (first.body as { id: number }).id;
    const seasonId = (
      (await http().get(`/series/${id}/seasons`)).body as { id: number }[]
    )[0].id;
    const episodes = (await http().get(`/seasons/${seasonId}/episodes`))
      .body as {
      id: number;
    }[];
    await http()
      .put(`/me/watched/episodes/${episodes[0].id}`)
      .set(as(user))
      .expect(204);

    catalog['SERIES:550'] = dark('Secrets (renamed)');
    const again = await importTitle({ type: 'SERIES', tmdbId: 550 }).expect(
      201,
    );

    expect((again.body as { id: number }).id).toBe(id);
    const after = (await http().get(`/seasons/${seasonId}/episodes`)).body as {
      id: number;
      name: string;
    }[];
    expect(after.map((e) => e.name)).toEqual(['Secrets (renamed)', 'Lies']);
    expect(after[0].id).toBe(episodes[0].id);
    const watched = (await http().get('/me/watched').set(as(user)).expect(200))
      .body as { data: { progress: { watched: number } }[] };
    expect(watched.data[0].progress.watched).toBe(1);
  });

  it('adopts a manually created title with the same name and year', async () => {
    const manual = await http()
      .post('/movies')
      .set(as(admin))
      .send({ name: 'Fight Club', year: 1999, genres: ['Old'] })
      .expect(201);

    const res = await importTitle({ type: 'MOVIE', tmdbId: 550 }).expect(201);

    expect((res.body as { id: number }).id).toBe(
      (manual.body as { id: number }).id,
    );
    expect((res.body as { genres: string[] }).genres).toEqual([
      'Drama',
      'Thriller',
    ]);
    const row = await app
      .get(PrismaService)
      .title.findFirstOrThrow({ select: { tmdbId: true } });
    expect(row.tmdbId).toBe(550);
  });

  it('rejects invalid input and unknown TMDB ids', async () => {
    await importTitle({ type: 'MOVIE' }).expect(400);
    await importTitle({ type: 'BOOK', tmdbId: 1 }).expect(400);
    await importTitle({ type: 'MOVIE', tmdbId: 0 }).expect(400);
    await importTitle({ type: 'MOVIE', tmdbId: 999 }).expect(404);
  });

  it('rejects a TMDB title without a release year', async () => {
    catalog['MOVIE:550'] = { ...fightClub, year: null };

    await importTitle({ type: 'MOVIE', tmdbId: 550 }).expect(400);
  });

  it('proxies the search', async () => {
    tmdb.search.mockResolvedValue([{ tmdbId: 550, name: 'Fight Club' }]);

    const res = await http()
      .get('/tmdb/search?q=fight&type=MOVIE')
      .set(as(admin))
      .expect(200);

    expect(res.body).toEqual([{ tmdbId: 550, name: 'Fight Club' }]);
    expect(tmdb.search).toHaveBeenCalledWith('MOVIE', 'fight');
    await http().get('/tmdb/search?type=MOVIE').set(as(admin)).expect(400);
  });
});
