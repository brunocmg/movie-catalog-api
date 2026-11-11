import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
  registerAdminAndLogin,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app';

type Created = { id: number };
type Season = { id: number; number: number; episodeCount: number };
type Episode = { id: number; number: number; name: string };

describe('Series, seasons and episodes (e2e)', () => {
  let app: INestApplication<App>;
  let admin: string;
  let user: string;
  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  const createSeries = async (name = 'Dark', year = 2017) =>
    (
      await http()
        .post('/series')
        .set(as(admin))
        .send({ name, year, genres: ['Sci-Fi'] })
        .expect(201)
    ).body as Created;

  const createSeason = async (seriesId: number, number = 1) =>
    (
      await http()
        .post(`/series/${seriesId}/seasons`)
        .set(as(admin))
        .send({ number })
        .expect(201)
    ).body as Season;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    ({ token: admin } = await registerAdminAndLogin(app));
    ({ token: user } = await registerAndLogin(app, {
      name: 'Joao',
      email: 'joao@email.com',
      password: '123456',
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/series', () => {
    it('creates a series that shows up in /series and /titles but not /movies', async () => {
      const series = await createSeries();

      const list = await http().get('/series').expect(200);
      expect((list.body as { data: unknown[] }).data).toHaveLength(1);
      await http().get(`/series/${series.id}`).expect(200);
      await http().get(`/titles/${series.id}`).expect(200);
      await http().get(`/movies/${series.id}`).expect(404);
    });

    it('only lets admins write', async () => {
      await http().post('/series').send({ name: 'X', year: 2000 }).expect(401);
      await http()
        .post('/series')
        .set(as(user))
        .send({ name: 'X', year: 2000 })
        .expect(403);
    });

    it('rejects a duplicate name and year', async () => {
      await createSeries();
      await http()
        .post('/series')
        .set(as(admin))
        .send({ name: 'Dark', year: 2017 })
        .expect(409);
    });

    it('updates and deletes, cascading to seasons and episodes', async () => {
      const series = await createSeries();
      const season = await createSeason(series.id);
      await http()
        .post(`/seasons/${season.id}/episodes`)
        .set(as(admin))
        .send({ number: 1, name: 'Secrets' })
        .expect(201);

      await http()
        .patch(`/series/${series.id}`)
        .set(as(admin))
        .send({ year: 2018 })
        .expect(200);
      await http().delete(`/series/${series.id}`).set(as(admin)).expect(204);

      await http().get(`/seasons/${season.id}`).expect(404);
    });
  });

  describe('seasons', () => {
    it('adds seasons, lists them in order and counts episodes', async () => {
      const series = await createSeries();
      await createSeason(series.id, 2);
      const first = await createSeason(series.id, 1);
      await http()
        .post(`/seasons/${first.id}/episodes`)
        .set(as(admin))
        .send({ number: 1, name: 'Pilot' })
        .expect(201);

      const res = await http().get(`/series/${series.id}/seasons`).expect(200);
      const seasons = res.body as Season[];
      expect(seasons.map((s) => s.number)).toEqual([1, 2]);
      expect(seasons.map((s) => s.episodeCount)).toEqual([1, 0]);
    });

    it('rejects a season on a movie or unknown series', async () => {
      const movie = (
        await http()
          .post('/movies')
          .set(as(admin))
          .send({ name: 'Heat', year: 1995 })
          .expect(201)
      ).body as Created;

      await http()
        .post(`/series/${movie.id}/seasons`)
        .set(as(admin))
        .send({ number: 1 })
        .expect(404);
      await http().get('/series/999/seasons').expect(404);
    });

    it('rejects a duplicate number and invalid bodies', async () => {
      const series = await createSeries();
      await createSeason(series.id);

      const post = (body: object) =>
        http().post(`/series/${series.id}/seasons`).set(as(admin)).send(body);
      await post({ number: 1 }).expect(409);
      await post({ number: -1 }).expect(400);
      await post({}).expect(400);
      await post({ number: 2, title: 'x' }).expect(400);
    });

    it('updates, blocks non-admins and deletes', async () => {
      const series = await createSeries();
      const season = await createSeason(series.id);

      await http()
        .patch(`/seasons/${season.id}`)
        .set(as(user))
        .send({ name: 'x' })
        .expect(403);
      const res = await http()
        .patch(`/seasons/${season.id}`)
        .set(as(admin))
        .send({ name: 'The beginning' })
        .expect(200);
      expect((res.body as { name: string }).name).toBe('The beginning');

      await http().delete(`/seasons/${season.id}`).set(as(admin)).expect(204);
      await http().delete(`/seasons/${season.id}`).set(as(admin)).expect(404);
    });
  });

  describe('episodes', () => {
    it('adds, lists, reads, updates and deletes', async () => {
      const series = await createSeries();
      const season = await createSeason(series.id);
      const add = (number: number, name: string) =>
        http()
          .post(`/seasons/${season.id}/episodes`)
          .set(as(admin))
          .send({ number, name, runtimeMinutes: 50 });

      await add(2, 'Lies').expect(201);
      const ep = (await add(1, 'Secrets').expect(201)).body as Episode;

      const list = (
        await http().get(`/seasons/${season.id}/episodes`).expect(200)
      ).body as Episode[];
      expect(list.map((e) => e.name)).toEqual(['Secrets', 'Lies']);

      await http().get(`/episodes/${ep.id}`).expect(200);
      const patched = await http()
        .patch(`/episodes/${ep.id}`)
        .set(as(admin))
        .send({ runtimeMinutes: 55 })
        .expect(200);
      expect(patched.body).toMatchObject({ runtimeMinutes: 55 });

      await add(1, 'Again').expect(409);
      await http().delete(`/episodes/${ep.id}`).set(as(admin)).expect(204);
      await http().get(`/episodes/${ep.id}`).expect(404);
    });

    it('validates input and restricts writes to admins', async () => {
      const series = await createSeries();
      const season = await createSeason(series.id);
      const url = `/seasons/${season.id}/episodes`;

      await http().post(url).set(as(admin)).send({ number: 1 }).expect(400);
      await http()
        .post(url)
        .set(as(admin))
        .send({ number: 1, name: 'A', runtimeMinutes: 0 })
        .expect(400);
      await http()
        .post(url)
        .set(as(user))
        .send({ number: 1, name: 'A' })
        .expect(403);
      await http().get('/seasons/999/episodes').expect(404);
    });
  });
});
