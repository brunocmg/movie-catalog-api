import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
  registerAdminAndLogin,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app';

type Rec = {
  data: { title: { name: string }; score: number; because: string[] }[];
  meta: { total: number };
};

describe('Stats and recommendations (e2e)', () => {
  let app: INestApplication<App>;
  let admin: string;
  let joao: string;
  let maria: string;
  const ids: Record<string, number> = {};
  const episodes: number[] = [];

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const create = async (url: string, body: object) =>
    (
      (await http().post(url).set(as(admin)).send(body).expect(201)).body as {
        id: number;
      }
    ).id;
  const watch = (token: string, path: string) =>
    http().put(`/me/watched/${path}`).set(as(token)).expect(204);
  const names = (rec: Rec) => rec.data.map((r) => r.title.name);
  const recs = async (token: string, query = '') =>
    (await http().get(`/me/recommendations${query}`).set(as(token)).expect(200))
      .body as Rec;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    ({ token: admin } = await registerAdminAndLogin(app));
    ({ token: joao } = await registerAndLogin(app, {
      name: 'Joao',
      email: 'joao@email.com',
      password: '123456',
    }));
    ({ token: maria } = await registerAndLogin(app, {
      name: 'Maria',
      email: 'maria@email.com',
      password: '123456',
    }));

    const movie = (
      name: string,
      year: number,
      runtime: number,
      genres: string[],
    ) => create('/movies', { name, year, runtimeMinutes: runtime, genres });
    ids.heat = await movie('Heat', 1995, 170, ['Crime', 'Drama']);
    ids.fight = await movie('Fight Club', 1999, 139, ['Drama', 'Thriller']);
    ids.amelie = await movie('Amelie', 2001, 122, ['Comedy']);
    ids.alien = await movie('Alien', 1979, 117, ['Sci-Fi', 'Horror']);
    ids.casino = await movie('Casino', 1995, 178, ['Crime', 'Drama']);
    ids.dark = await create('/series', {
      name: 'Dark',
      year: 2017,
      runtimeMinutes: 55,
      genres: ['Sci-Fi', 'Drama'],
    });
    const season = await create(`/series/${ids.dark}/seasons`, { number: 1 });
    episodes.length = 0;
    episodes.push(
      await create(`/seasons/${season}/episodes`, {
        number: 1,
        name: 'Secrets',
        runtimeMinutes: 51,
      }),
      await create(`/seasons/${season}/episodes`, { number: 2, name: 'Lies' }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    await http().get('/me/stats').expect(401);
    await http().get('/me/recommendations').expect(401);
  });

  describe('GET /me/stats', () => {
    it('is empty for a new user', async () => {
      const res = await http().get('/me/stats').set(as(joao)).expect(200);

      expect(res.body).toEqual({
        watched: { movies: 0, series: 0, episodes: 0 },
        watchTime: { minutes: 0, hours: 0 },
        topGenres: [],
        ratings: { count: 0, average: null },
      });
    });

    it('sums counts, watch time and genres from the history', async () => {
      await watch(joao, `${ids.heat}`);
      await watch(joao, `${ids.fight}`);
      await watch(joao, `episodes/${episodes[0]}`);
      await watch(joao, `episodes/${episodes[1]}`);
      await http()
        .put(`/me/ratings/${ids.heat}`)
        .set(as(joao))
        .send({ score: 10 })
        .expect(200);
      await http()
        .put(`/me/ratings/${ids.fight}`)
        .set(as(joao))
        .send({ score: 7 })
        .expect(200);

      const res = await http().get('/me/stats').set(as(joao)).expect(200);

      // 170 + 139 + 51 + 55 (the second episode falls back to the series runtime)
      expect(res.body).toEqual({
        watched: { movies: 2, series: 1, episodes: 2 },
        watchTime: { minutes: 415, hours: 6.9 },
        topGenres: [
          { name: 'Drama', slug: 'drama', count: 3 },
          { name: 'Crime', slug: 'crime', count: 1 },
          { name: 'Sci-Fi', slug: 'sci-fi', count: 1 },
          { name: 'Thriller', slug: 'thriller', count: 1 },
        ],
        ratings: { count: 2, average: 8.5 },
      });
    });

    it('only counts the own history', async () => {
      await watch(maria, `${ids.heat}`);

      const res = await http().get('/me/stats').set(as(joao)).expect(200);

      expect((res.body as { watched: { movies: number } }).watched.movies).toBe(
        0,
      );
    });

    it('follows unmarking', async () => {
      await watch(joao, `${ids.heat}`);
      await http().delete(`/me/watched/${ids.heat}`).set(as(joao)).expect(204);

      const res = await http().get('/me/stats').set(as(joao)).expect(200);

      expect(res.body).toMatchObject({
        watched: { movies: 0 },
        watchTime: { minutes: 0 },
        topGenres: [],
      });
    });
  });

  describe('GET /me/recommendations', () => {
    beforeEach(async () => {
      await watch(joao, `${ids.heat}`);
      await watch(joao, `${ids.fight}`);
      await watch(joao, `episodes/${episodes[0]}`);
    });

    it('ranks unwatched titles by genre match and explains why', async () => {
      const res = await recs(joao);

      // Drama 3, Crime 1, Thriller 1, Sci-Fi 1 -> Casino (Crime+Drama) then Alien (Sci-Fi)
      expect(names(res)).toEqual(['Casino', 'Alien']);
      expect(res.data[0].because).toEqual(['Crime', 'Drama']);
      expect(res.data[1].because).toEqual(['Sci-Fi']);
      expect(res.meta.total).toBe(2);
    });

    it('never recommends what was already watched', async () => {
      expect(names(await recs(joao))).not.toContain('Heat');
      expect(names(await recs(joao))).not.toContain('Dark');
    });

    it('lets a low rating pull a genre down and a favorite push it up', async () => {
      await http()
        .put(`/me/ratings/${ids.fight}`)
        .set(as(joao))
        .send({ score: 1 })
        .expect(200);
      await http()
        .put(`/me/ratings/${ids.heat}`)
        .set(as(joao))
        .send({ score: 1 })
        .expect(200);
      await http().put(`/me/favorites/${ids.alien}`).set(as(joao)).expect(204);

      // Drama: 3 - 3.2 < 0 and Crime: 1 - 1.6 < 0 drop out; Alien's Sci-Fi stays
      expect(names(await recs(joao))).toEqual(['Alien']);
    });

    it('lets the community rating break a close match', async () => {
      for (const token of [maria, admin]) {
        await http()
          .put(`/me/ratings/${ids.alien}`)
          .set(as(token))
          .send({ score: 10 })
          .expect(200);
      }

      const res = await recs(joao);

      expect(
        res.data.find((r) => r.title.name === 'Alien')?.score,
      ).toBeGreaterThan(0.6);
    });

    it('filters by type and paginates', async () => {
      expect(names(await recs(joao, '?type=SERIES'))).toEqual([]);
      const page = await recs(joao, '?limit=1&offset=1');
      expect(names(page)).toEqual(['Alien']);
      expect(page.meta.total).toBe(2);
      await http()
        .get('/me/recommendations?type=BOOK')
        .set(as(joao))
        .expect(400);
    });
  });

  it('falls back to the best rated titles without history', async () => {
    for (const token of [maria, admin]) {
      await http()
        .put(`/me/ratings/${ids.amelie}`)
        .set(as(token))
        .send({ score: 10 })
        .expect(200);
    }

    const res = await recs(joao);

    expect(res.data[0].title.name).toBe('Amelie');
    expect(res.data[0].because).toEqual([]);
    expect(res.meta.total).toBe(6);
  });
});
