import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
  registerAdminAndLogin,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app';

type Page = {
  data: { title: { id: number; name: string }; favoritedAt: string }[];
  meta: { total: number };
};

describe('Favorites (e2e)', () => {
  let app: INestApplication<App>;
  let admin: string;
  let user: string;
  let other: string;
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
  const list = async (token = user, query = '') =>
    (await http().get(`/me/favorites${query}`).set(as(token)).expect(200))
      .body as Page;

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
    ({ token: other } = await registerAndLogin(app, {
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

  it('requires authentication', async () => {
    await http().get('/me/favorites').expect(401);
    await http().put(`/me/favorites/${movieId}`).expect(401);
    await http().delete(`/me/favorites/${movieId}`).expect(401);
  });

  it('adds and removes idempotently', async () => {
    await http().put(`/me/favorites/${movieId}`).set(as(user)).expect(204);
    await http().put(`/me/favorites/${movieId}`).set(as(user)).expect(204);

    const page = await list();
    expect(page.meta.total).toBe(1);
    expect(page.data[0].title.name).toBe('Heat');

    await http().delete(`/me/favorites/${movieId}`).set(as(user)).expect(204);
    await http().delete(`/me/favorites/${movieId}`).set(as(user)).expect(204);
    expect((await list()).meta.total).toBe(0);
  });

  it('lists the most recent first, paginates and filters by type', async () => {
    await http().put(`/me/favorites/${movieId}`).set(as(user)).expect(204);
    await http().put(`/me/favorites/${seriesId}`).set(as(user)).expect(204);

    expect((await list()).data.map((f) => f.title.name)).toEqual([
      'Dark',
      'Heat',
    ]);
    const first = await list(user, '?limit=1');
    expect(first.data).toHaveLength(1);
    expect(first.meta.total).toBe(2);
    expect(
      (await list(user, '?type=MOVIE')).data.map((f) => f.title.name),
    ).toEqual(['Heat']);
    await http().get('/me/favorites?type=BOOK').set(as(user)).expect(400);
  });

  it('keeps each user list separate', async () => {
    await http().put(`/me/favorites/${movieId}`).set(as(user)).expect(204);

    expect((await list(other)).meta.total).toBe(0);
    await http().delete(`/me/favorites/${movieId}`).set(as(other)).expect(204);
    expect((await list()).meta.total).toBe(1);
  });

  it('rejects unknown titles and invalid ids', async () => {
    await http().put('/me/favorites/999').set(as(user)).expect(404);
    await http().put('/me/favorites/abc').set(as(user)).expect(400);
  });

  it('drops favorites when the title is deleted', async () => {
    await http().put(`/me/favorites/${movieId}`).set(as(user)).expect(204);
    await http().delete(`/movies/${movieId}`).set(as(admin)).expect(204);

    expect((await list()).meta.total).toBe(0);
  });
});
