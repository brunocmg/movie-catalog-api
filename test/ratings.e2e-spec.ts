import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { App } from 'supertest/types';
import {
  createTestApp,
  registerAdminAndLogin,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app';

type Summary = { rating: { average: number | null; count: number } };
type Reviews = {
  data: { user: { name: string }; score: number; review: string }[];
  meta: { total: number };
};

describe('Ratings and reviews (e2e)', () => {
  let app: INestApplication<App>;
  let admin: string;
  let joao: string;
  let maria: string;
  let movieId: number;
  let seriesId: number;

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const create = async (url: string, body: object) =>
    (
      (await http().post(url).set(as(admin)).send(body).expect(201)).body as {
        id: number;
      }
    ).id;
  const rate = (token: string, id: number, body: object) =>
    http().put(`/me/ratings/${id}`).set(as(token)).send(body);
  const summary = async (id = movieId) =>
    ((await http().get(`/titles/${id}`).expect(200)).body as Summary).rating;

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
    movieId = await create('/movies', { name: 'Heat', year: 1995 });
    seriesId = await create('/series', { name: 'Dark', year: 2017 });
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication to rate', async () => {
    await http().put(`/me/ratings/${movieId}`).send({ score: 5 }).expect(401);
    await http().get('/me/ratings').expect(401);
    await http().delete(`/me/ratings/${movieId}`).expect(401);
  });

  it('starts without ratings', async () => {
    expect(await summary()).toEqual({ average: null, count: 0 });
  });

  describe('rating', () => {
    it('stores the score and review and returns them', async () => {
      const res = await rate(joao, movieId, {
        score: 9,
        review: '  Great.  ',
      }).expect(200);

      expect(res.body).toMatchObject({
        titleId: movieId,
        score: 9,
        review: 'Great.',
      });
      await http().get(`/me/ratings/${movieId}`).set(as(joao)).expect(200);
      await http().get(`/me/ratings/${seriesId}`).set(as(joao)).expect(404);
    });

    it('keeps one rating per user and replaces it on a new PUT', async () => {
      await rate(joao, movieId, { score: 5, review: 'Ok' }).expect(200);
      const again = await rate(joao, movieId, { score: 8 }).expect(200);

      expect(again.body).toMatchObject({ score: 8, review: null });
      expect(await summary()).toEqual({ average: 8, count: 1 });
    });

    it('validates the score, review and title', async () => {
      await rate(joao, movieId, { score: 0 }).expect(400);
      await rate(joao, movieId, { score: 11 }).expect(400);
      await rate(joao, movieId, { score: 7.5 }).expect(400);
      await rate(joao, movieId, {}).expect(400);
      await rate(joao, movieId, { score: 5, review: 'x'.repeat(2001) }).expect(
        400,
      );
      await rate(joao, movieId, { score: 5, mood: 'good' }).expect(400);
      await rate(joao, 999, { score: 5 }).expect(404);
      await http()
        .put('/me/ratings/abc')
        .set(as(joao))
        .send({ score: 5 })
        .expect(400);
    });
  });

  describe('average and count', () => {
    it('are shown in the detail and in every listing', async () => {
      await rate(joao, movieId, { score: 9 }).expect(200);
      await rate(maria, movieId, { score: 6 }).expect(200);
      await rate(maria, seriesId, { score: 10 }).expect(200);

      expect(await summary()).toEqual({ average: 7.5, count: 2 });
      expect(await summary(seriesId)).toEqual({ average: 10, count: 1 });

      const list = (await http().get('/movies').expect(200)).body as {
        data: Summary[];
      };
      expect(list.data[0].rating).toEqual({ average: 7.5, count: 2 });
    });

    it('rounds to one decimal', async () => {
      await rate(joao, movieId, { score: 10 }).expect(200);
      await rate(maria, movieId, { score: 9 }).expect(200);
      await rate(admin, movieId, { score: 9 }).expect(200);

      expect((await summary()).average).toBe(9.3);
    });

    it('follow changes and removals', async () => {
      await rate(joao, movieId, { score: 9 }).expect(200);
      await rate(maria, movieId, { score: 5 }).expect(200);
      await rate(maria, movieId, { score: 7 }).expect(200);
      expect(await summary()).toEqual({ average: 8, count: 2 });

      await http().delete(`/me/ratings/${movieId}`).set(as(joao)).expect(204);
      expect(await summary()).toEqual({ average: 7, count: 1 });

      await http().delete(`/me/ratings/${movieId}`).set(as(joao)).expect(204);
      await http().delete(`/me/ratings/${movieId}`).set(as(maria)).expect(204);
      expect(await summary()).toEqual({ average: null, count: 0 });
    });

    it('stay correct when many users rate at the same time', async () => {
      const prisma = app.get(PrismaService);
      const users = await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          prisma.user.create({
            data: {
              name: `User ${i}`,
              email: `user${i}@email.com`,
              passwordHash: 'x',
            },
          }),
        ),
      );

      await Promise.all(
        users.map((u, i) =>
          prisma.rating.create({
            data: { userId: u.id, titleId: movieId, score: i + 1 },
          }),
        ),
      );
      await Promise.all(
        users.slice(0, 3).map((u) =>
          prisma.rating.update({
            where: { userId_titleId: { userId: u.id, titleId: movieId } },
            data: { score: 10 },
          }),
        ),
      );

      // scores 10, 10, 10, 4, 5, 6
      expect(await summary()).toEqual({ average: 7.5, count: 6 });
    });

    it('drop the rating of a deleted user', async () => {
      await rate(joao, movieId, { score: 4 }).expect(200);
      await rate(maria, movieId, { score: 8 }).expect(200);

      const me = (await http().get('/me').set(as(maria)).expect(200)).body as {
        id: number;
      };
      await http().delete(`/users/${me.id}`).set(as(admin)).expect(204);

      expect((await http().get(`/titles/${movieId}/reviews`)).status).toBe(200);
      expect(await summary()).toEqual({ average: 4, count: 1 });
    });
  });

  describe('GET /me/ratings', () => {
    it('lists mine, most recent first, with type filter and pagination', async () => {
      await rate(joao, movieId, { score: 7 }).expect(200);
      await rate(joao, seriesId, { score: 8 }).expect(200);
      await rate(maria, movieId, { score: 1 }).expect(200);

      const all = (await http().get('/me/ratings').set(as(joao)).expect(200))
        .body as {
        data: { title: { name: string }; score: number }[];
        meta: { total: number };
      };
      expect(all.data.map((r) => r.title.name)).toEqual(['Dark', 'Heat']);
      expect(all.meta.total).toBe(2);

      const movies = (
        await http().get('/me/ratings?type=MOVIE').set(as(joao)).expect(200)
      ).body as { data: { score: number }[] };
      expect(movies.data.map((r) => r.score)).toEqual([7]);

      const page = (
        await http().get('/me/ratings?limit=1').set(as(joao)).expect(200)
      ).body as { data: unknown[]; meta: { total: number } };
      expect(page.data).toHaveLength(1);
      expect(page.meta.total).toBe(2);
      await http().get('/me/ratings?type=BOOK').set(as(joao)).expect(400);
    });
  });

  describe('GET /titles/:id/reviews', () => {
    it('is public and only lists ratings that have a review', async () => {
      await rate(joao, movieId, { score: 9, review: 'Great' }).expect(200);
      await rate(maria, movieId, { score: 3 }).expect(200);

      const res = (await http().get(`/titles/${movieId}/reviews`).expect(200))
        .body as Reviews;

      expect(res.meta.total).toBe(1);
      expect(res.data[0]).toMatchObject({
        user: { name: 'Joao' },
        score: 9,
        review: 'Great',
      });
      expect(JSON.stringify(res)).not.toContain('email');
    });

    it('clears the review when it is sent empty', async () => {
      await rate(joao, movieId, { score: 9, review: 'Great' }).expect(200);
      await rate(joao, movieId, { score: 9, review: '   ' }).expect(200);

      const res = (await http().get(`/titles/${movieId}/reviews`))
        .body as Reviews;
      expect(res.meta.total).toBe(0);
    });

    it('paginates and rejects unknown titles', async () => {
      await rate(joao, movieId, { score: 9, review: 'A' }).expect(200);
      await rate(maria, movieId, { score: 8, review: 'B' }).expect(200);

      const first = (
        await http().get(`/titles/${movieId}/reviews?limit=1`).expect(200)
      ).body as Reviews;
      expect(first.data).toHaveLength(1);
      expect(first.meta.total).toBe(2);
      await http().get('/titles/999/reviews').expect(404);
    });
  });
});
