import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
  registerAdminAndLogin,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app';

type Item = {
  title: { id: number; name: string; type: string };
  progress: { watched: number; total: number } | null;
};
type Page = { data: Item[]; meta: { total: number } };

describe('Watch history (e2e)', () => {
  let app: INestApplication<App>;
  let admin: string;
  let user: string;
  let other: string;
  let movieId: number;
  let seriesId: number;
  let episodeIds: number[];

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const post = async (url: string, body: object) =>
    (
      (await http().post(url).set(as(admin)).send(body).expect(201)).body as {
        id: number;
      }
    ).id;
  const list = async (token = user, query = '') =>
    (await http().get(`/me/watched${query}`).set(as(token)).expect(200))
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

    movieId = await post('/movies', { name: 'Heat', year: 1995 });
    seriesId = await post('/series', { name: 'Dark', year: 2017 });
    const s1 = await post(`/series/${seriesId}/seasons`, { number: 1 });
    const s2 = await post(`/series/${seriesId}/seasons`, { number: 2 });
    episodeIds = [
      await post(`/seasons/${s1}/episodes`, { number: 1, name: 'Secrets' }),
      await post(`/seasons/${s1}/episodes`, { number: 2, name: 'Lies' }),
      await post(`/seasons/${s2}/episodes`, { number: 1, name: 'Beginnings' }),
    ];
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    await http().get('/me/watched').expect(401);
    await http().put(`/me/watched/${movieId}`).expect(401);
  });

  describe('movies', () => {
    it('marks idempotently, lists and unmarks', async () => {
      await http().put(`/me/watched/${movieId}`).set(as(user)).expect(204);
      await http().put(`/me/watched/${movieId}`).set(as(user)).expect(204);

      const page = await list();
      expect(page.meta.total).toBe(1);
      expect(page.data[0]).toMatchObject({
        title: { name: 'Heat', type: 'MOVIE' },
        progress: null,
      });

      await http().get(`/me/watched/${movieId}`).set(as(user)).expect(200);
      await http().delete(`/me/watched/${movieId}`).set(as(user)).expect(204);
      await http().delete(`/me/watched/${movieId}`).set(as(user)).expect(204);
      expect((await list()).meta.total).toBe(0);
      await http().get(`/me/watched/${movieId}`).set(as(user)).expect(404);
    });

    it('keeps each user history separate', async () => {
      await http().put(`/me/watched/${movieId}`).set(as(user)).expect(204);

      expect((await list(other)).meta.total).toBe(0);
    });

    it('rejects an unknown title and invalid ids', async () => {
      await http().put('/me/watched/999').set(as(user)).expect(404);
      await http().put('/me/watched/abc').set(as(user)).expect(400);
    });
  });

  describe('series', () => {
    it('shows progress as episodes are marked', async () => {
      await http()
        .put(`/me/watched/episodes/${episodeIds[0]}`)
        .set(as(user))
        .expect(204);
      await http()
        .put(`/me/watched/episodes/${episodeIds[0]}`)
        .set(as(user))
        .expect(204);
      await http()
        .put(`/me/watched/episodes/${episodeIds[2]}`)
        .set(as(user))
        .expect(204);

      const page = await list();
      expect(page.data).toHaveLength(1);
      expect(page.data[0].progress).toEqual({ watched: 2, total: 3 });

      const detail = (
        await http().get(`/me/watched/${seriesId}`).set(as(user)).expect(200)
      ).body as Item;
      expect(detail.progress).toEqual({ watched: 2, total: 3 });

      const episodes = (
        await http()
          .get(`/me/watched/${seriesId}/episodes`)
          .set(as(user))
          .expect(200)
      ).body as { seasonNumber: number; number: number; watched: boolean }[];
      expect(
        episodes.map((e) => `${e.seasonNumber}x${e.number}:${e.watched}`),
      ).toEqual(['1x1:true', '1x2:false', '2x1:true']);
    });

    it('marks every episode when the whole series is marked', async () => {
      await http().put(`/me/watched/${seriesId}`).set(as(user)).expect(204);

      expect((await list()).data[0].progress).toEqual({ watched: 3, total: 3 });
    });

    it('drops the series when its last episode is unmarked', async () => {
      const unmark = (id: number) =>
        http().delete(`/me/watched/episodes/${id}`).set(as(user)).expect(204);
      await http()
        .put(`/me/watched/episodes/${episodeIds[0]}`)
        .set(as(user))
        .expect(204);
      await http()
        .put(`/me/watched/episodes/${episodeIds[1]}`)
        .set(as(user))
        .expect(204);

      await unmark(episodeIds[0]);
      expect((await list()).data[0].progress).toEqual({ watched: 1, total: 3 });
      await unmark(episodeIds[1]);
      await unmark(episodeIds[1]);
      expect((await list()).meta.total).toBe(0);
    });

    it('unmarks the series with all its episodes', async () => {
      await http().put(`/me/watched/${seriesId}`).set(as(user)).expect(204);
      await http().delete(`/me/watched/${seriesId}`).set(as(user)).expect(204);

      expect((await list()).meta.total).toBe(0);
      const episodes = (
        await http()
          .get(`/me/watched/${seriesId}/episodes`)
          .set(as(user))
          .expect(200)
      ).body as { watched: boolean }[];
      expect(episodes.every((e) => !e.watched)).toBe(true);
    });

    it('rejects unknown episodes and listing episodes of a movie', async () => {
      await http().put('/me/watched/episodes/999').set(as(user)).expect(404);
      await http().delete('/me/watched/episodes/999').set(as(user)).expect(404);
      await http()
        .get(`/me/watched/${movieId}/episodes`)
        .set(as(user))
        .expect(404);
    });
  });

  it('filters the list by type and paginates', async () => {
    await http().put(`/me/watched/${movieId}`).set(as(user)).expect(204);
    await http().put(`/me/watched/${seriesId}`).set(as(user)).expect(204);

    const series = await list(user, '?type=SERIES');
    expect(series.data.map((i) => i.title.name)).toEqual(['Dark']);
    const first = await list(user, '?limit=1');
    expect(first.data).toHaveLength(1);
    expect(first.meta.total).toBe(2);
    await http().get('/me/watched?type=BOOK').set(as(user)).expect(400);
  });

  it('removes the history when the series is deleted', async () => {
    await http().put(`/me/watched/${seriesId}`).set(as(user)).expect(204);
    await http().delete(`/series/${seriesId}`).set(as(admin)).expect(204);

    expect((await list()).meta.total).toBe(0);
  });
});
