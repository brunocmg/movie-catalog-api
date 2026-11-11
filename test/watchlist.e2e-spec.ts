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
  data: { title: { id: number; name: string }; priority: string | null }[];
  meta: { total: number };
};

describe('Watchlist (e2e)', () => {
  let app: INestApplication<App>;
  let admin: string;
  let user: string;
  let other: string;
  let movieId: number;
  let seriesId: number;
  let episodeId: number;

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const create = async (url: string, body: object) =>
    (
      (await http().post(url).set(as(admin)).send(body).expect(201)).body as {
        id: number;
      }
    ).id;
  const add = (id: number, body: object = {}, token = user) =>
    http().put(`/me/watchlist/${id}`).set(as(token)).send(body);
  const list = async (token = user, query = '') =>
    (await http().get(`/me/watchlist${query}`).set(as(token)).expect(200))
      .body as Page;
  const names = (page: Page) => page.data.map((i) => i.title.name);

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
    const season = await create(`/series/${seriesId}/seasons`, { number: 1 });
    episodeId = await create(`/seasons/${season}/episodes`, {
      number: 1,
      name: 'Secrets',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    await http().get('/me/watchlist').expect(401);
    await http().put(`/me/watchlist/${movieId}`).expect(401);
    await http().delete(`/me/watchlist/${movieId}`).expect(401);
  });

  it('adds and removes idempotently', async () => {
    await add(movieId).expect(204);
    await add(movieId).expect(204);
    expect((await list()).meta.total).toBe(1);

    await http().delete(`/me/watchlist/${movieId}`).set(as(user)).expect(204);
    await http().delete(`/me/watchlist/${movieId}`).set(as(user)).expect(204);
    expect((await list()).meta.total).toBe(0);
  });

  it('keeps the priority when re-adding without one and changes it when given', async () => {
    await add(movieId, { priority: 'HIGH' }).expect(204);
    await add(movieId).expect(204);
    expect((await list()).data[0].priority).toBe('HIGH');

    await add(movieId, { priority: 'LOW' }).expect(204);
    expect((await list()).data[0].priority).toBe('LOW');
  });

  it('orders by priority, then most recent, with unprioritised last', async () => {
    const third = await create('/movies', { name: 'Ronin', year: 1998 });
    await add(movieId).expect(204);
    await add(seriesId, { priority: 'MEDIUM' }).expect(204);
    await add(third, { priority: 'HIGH' }).expect(204);

    expect(names(await list())).toEqual(['Ronin', 'Dark', 'Heat']);
  });

  it('filters by type and paginates', async () => {
    await add(movieId).expect(204);
    await add(seriesId).expect(204);

    expect(names(await list(user, '?type=SERIES'))).toEqual(['Dark']);
    const first = await list(user, '?limit=1');
    expect(first.data).toHaveLength(1);
    expect(first.meta.total).toBe(2);
    await http().get('/me/watchlist?type=BOOK').set(as(user)).expect(400);
  });

  it('keeps each user list separate', async () => {
    await add(movieId).expect(204);

    expect((await list(other)).meta.total).toBe(0);
  });

  it('rejects unknown titles, invalid ids and priorities', async () => {
    await add(999).expect(404);
    await http().put('/me/watchlist/abc').set(as(user)).expect(400);
    await add(movieId, { priority: 'URGENT' }).expect(400);
    await add(movieId, { rank: 1 }).expect(400);
  });

  describe('watching', () => {
    it('leaves the watchlist when the title is marked as watched', async () => {
      await add(movieId).expect(204);
      await add(seriesId).expect(204);

      await http().put(`/me/watched/${movieId}`).set(as(user)).expect(204);
      expect(names(await list())).toEqual(['Dark']);

      await http().put(`/me/watched/${seriesId}`).set(as(user)).expect(204);
      expect((await list()).meta.total).toBe(0);
    });

    it('leaves the watchlist when an episode is marked as watched', async () => {
      await add(seriesId).expect(204);

      await http()
        .put(`/me/watched/episodes/${episodeId}`)
        .set(as(user))
        .expect(204);

      expect((await list()).meta.total).toBe(0);
    });

    it('does not touch other users lists', async () => {
      await add(movieId, {}, other).expect(204);

      await http().put(`/me/watched/${movieId}`).set(as(user)).expect(204);

      expect((await list(other)).meta.total).toBe(1);
    });
  });
});
