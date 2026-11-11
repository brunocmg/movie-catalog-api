import { INestApplication } from '@nestjs/common';
import { TitleType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  registerAdminAndLogin,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app';

type Page = { data: { name: string }[]; meta: { total: number } };

// Runs against the memory store by default and against a real Redis when
// REDIS_URL_TEST is set (CI does; locally: docker compose up -d redis)
const redisUrl = process.env.REDIS_URL_TEST;

function cacheSuite(label: string, url?: string) {
  describe(`Catalog cache (${label})`, () => {
    let app: INestApplication<App>;
    let admin: string;
    const http = () => request(app.getHttpServer());
    const as = (token: string) => ({ Authorization: `Bearer ${token}` });
    const names = async (path: string) =>
      ((await http().get(path).expect(200)).body as Page).data.map(
        (t) => t.name,
      );
    const createMovie = async (name: string, year = 2000) =>
      (
        (
          await http()
            .post('/movies')
            .set(as(admin))
            .send({ name, year })
            .expect(201)
        ).body as { id: number }
      ).id;
    // a write that bypasses the API, so only the cache can hide it
    const insertBehindTheCache = (name: string) =>
      app
        .get(PrismaService)
        .title.create({ data: { type: TitleType.MOVIE, name, year: 2001 } });

    beforeAll(async () => {
      if (url) process.env.REDIS_URL = url;
      app = await createTestApp();
    });

    beforeEach(async () => {
      await resetDatabase(app);
      ({ token: admin } = await registerAdminAndLogin(app));
    });

    afterAll(async () => {
      await app.close();
      delete process.env.REDIS_URL;
    });

    it('serves a listing from the cache until a write invalidates it', async () => {
      await createMovie('Heat');
      expect(await names('/movies')).toEqual(['Heat']);

      await insertBehindTheCache('Hidden');
      expect(await names('/movies')).toEqual(['Heat']);

      await createMovie('Ronin');
      expect(await names('/movies')).toEqual(['Heat', 'Hidden', 'Ronin']);
    });

    it('keeps different queries apart', async () => {
      await createMovie('Heat');
      await createMovie('Ronin');

      expect(await names('/movies?q=heat')).toEqual(['Heat']);
      expect(await names('/movies?q=ronin')).toEqual(['Ronin']);
      expect(await names('/movies?limit=1&offset=1')).toEqual(['Ronin']);
    });

    it('refreshes the detail after an update, a poster change and a delete', async () => {
      const id = await createMovie('Heat');
      const detail = async () =>
        (await http().get(`/movies/${id}`)).body as { name: string };
      expect((await detail()).name).toBe('Heat');

      await http()
        .patch(`/movies/${id}`)
        .set(as(admin))
        .send({ name: 'Heat (1995)' })
        .expect(200);
      expect((await detail()).name).toBe('Heat (1995)');

      await http().delete(`/movies/${id}`).set(as(admin)).expect(204);
      await http().get(`/movies/${id}`).expect(404);
    });

    it('does not cache a missing title', async () => {
      await http().get('/titles/1').expect(404);

      const id = await createMovie('Heat');
      await http().get(`/titles/${id}`).expect(200);
    });

    it('refreshes the average when someone rates', async () => {
      const id = await createMovie('Heat');
      const rating = async () =>
        (
          (await http().get(`/titles/${id}`)).body as {
            rating: { average: number | null; count: number };
          }
        ).rating;
      expect(await rating()).toEqual({ average: null, count: 0 });

      const { token } = await registerAndLogin(app, {
        name: 'Joao',
        email: 'joao@email.com',
        password: '123456',
      });
      await http()
        .put(`/me/ratings/${id}`)
        .set(as(token))
        .send({ score: 8 })
        .expect(200);
      expect(await rating()).toEqual({ average: 8, count: 1 });

      await http().delete(`/me/ratings/${id}`).set(as(token)).expect(204);
      expect(await rating()).toEqual({ average: null, count: 0 });
    });

    it('refreshes the average when a rating goes away with its user', async () => {
      const id = await createMovie('Heat');
      const joao = await registerAndLogin(app, {
        name: 'Joao',
        email: 'joao@email.com',
        password: '123456',
      });
      await http()
        .put(`/me/ratings/${id}`)
        .set(as(joao.token))
        .send({ score: 8 })
        .expect(200);
      expect(
        (
          (await http().get(`/titles/${id}`)).body as {
            rating: { count: number };
          }
        ).rating.count,
      ).toBe(1);

      await http().delete(`/users/${joao.id}`).set(as(admin)).expect(204);

      expect(
        (
          (await http().get(`/titles/${id}`)).body as {
            rating: { count: number };
          }
        ).rating.count,
      ).toBe(0);
    });

    it('refreshes the genres', async () => {
      await http().get('/genres').expect(200);
      await http()
        .post('/movies')
        .set(as(admin))
        .send({ name: 'Heat', year: 1995, genres: ['Crime'] })
        .expect(201);

      const genres = (await http().get('/genres').expect(200)).body as {
        slug: string;
      }[];
      expect(genres.map((g) => g.slug)).toEqual(['crime']);
    });
  });
}

cacheSuite('memory');
if (redisUrl) cacheSuite('redis', redisUrl);

describe('Metrics (e2e)', () => {
  const metricsApp = async (env: Record<string, string> = {}) => {
    Object.assign(process.env, env);
    return createTestApp();
  };
  const reset = () => {
    delete process.env.METRICS_TOKEN;
  };
  afterEach(reset);

  it('exposes request and cache counters in the Prometheus format', async () => {
    const app = await metricsApp();
    await resetDatabase(app);
    const { token } = await registerAdminAndLogin(app);
    const created = await request(app.getHttpServer())
      .post('/movies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Heat', year: 1995 })
      .expect(201);
    const id = (created.body as { id: number }).id;
    await request(app.getHttpServer()).get(`/movies/${id}`).expect(200);
    await request(app.getHttpServer()).get(`/movies/${id}`).expect(200);
    await request(app.getHttpServer()).get('/movies/999').expect(404);

    const res = await request(app.getHttpServer()).get('/metrics').expect(200);

    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain(
      'http_requests_total{method="GET",route="/movies/:id",status="200"} 2',
    );
    expect(res.text).toContain(
      'http_requests_total{method="GET",route="/movies/:id",status="404"} 1',
    );
    expect(res.text).toContain('http_request_duration_seconds_bucket');
    expect(res.text).toMatch(/cache_requests_total\{result="hit"\} [1-9]/);
    expect(res.text).toMatch(/cache_requests_total\{result="miss"\} [1-9]/);
    // ids never become labels, and the scrape itself is not counted
    expect(res.text).not.toContain(`/movies/${id}"`);
    expect(res.text).not.toContain('route="/metrics"');
    await app.close();
  });

  it('requires the bearer token when one is configured', async () => {
    const app = await metricsApp({ METRICS_TOKEN: 'scrape-secret' });
    const http = () => request(app.getHttpServer());

    await http().get('/metrics').expect(401);
    await http()
      .get('/metrics')
      .set('Authorization', 'Bearer wrong-secret')
      .expect(401);
    await http()
      .get('/metrics')
      .set('Authorization', 'Bearer scrape-secret')
      .expect(200);
    await app.close();
  });
});
