import { INestApplication } from '@nestjs/common';
import { TitleType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  registerAdminAndLogin,
  resetDatabase,
} from './utils/test-app';

type TitleBody = {
  id: number;
  type: string;
  name: string;
  genres: string[];
  runtimeMinutes: number | null;
};
type Page = { data: TitleBody[]; meta: { total: number } };

describe('Titles and genres (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  const http = () => request(app.getHttpServer());

  const createMovie = (body: object) =>
    http().post('/movies').set('Authorization', `Bearer ${token}`).send(body);

  const createSeries = (name: string, year: number) =>
    app.get(PrismaService).title.create({
      data: { type: TitleType.SERIES, name, year },
    });

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    ({ token } = await registerAdminAndLogin(app));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('movie fields and genres', () => {
    it('stores the new fields and creates genres on the fly', async () => {
      const res = await createMovie({
        name: 'Fight Club',
        year: 1999,
        director: 'David Fincher',
        synopsis: 'An insomniac office worker...',
        posterUrl: 'https://image.example.com/fc.jpg',
        runtimeMinutes: 139,
        genres: ['Thriller', 'Drama'],
      }).expect(201);

      expect(res.body).toMatchObject({
        type: 'MOVIE',
        runtimeMinutes: 139,
        genres: ['Drama', 'Thriller'],
        posterUrl: 'https://image.example.com/fc.jpg',
      });

      const genres = await http().get('/genres').expect(200);
      expect((genres.body as { slug: string }[]).map((g) => g.slug)).toEqual([
        'drama',
        'thriller',
      ]);
    });

    it('reuses a genre regardless of case and accents', async () => {
      await createMovie({ name: 'A', year: 2000, genres: ['Ação'] }).expect(
        201,
      );
      await createMovie({
        name: 'B',
        year: 2001,
        genres: ['acao', 'ACAO'],
      }).expect(201);

      const genres = await http().get('/genres').expect(200);
      expect(genres.body).toHaveLength(1);
    });

    it('replaces the genres on update and keeps them when omitted', async () => {
      const movie = (
        await createMovie({
          name: 'Heat',
          year: 1995,
          genres: ['Crime', 'Drama'],
        })
      ).body as TitleBody;
      const patch = (body: object) =>
        http()
          .patch(`/movies/${movie.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(body);

      expect(
        (
          (await patch({ director: 'Michael Mann' }).expect(200))
            .body as TitleBody
        ).genres,
      ).toEqual(['Crime', 'Drama']);
      expect(
        ((await patch({ genres: ['Action'] }).expect(200)).body as TitleBody)
          .genres,
      ).toEqual(['Action']);
      expect(
        ((await patch({ genres: [] }).expect(200)).body as TitleBody).genres,
      ).toEqual([]);
    });

    it('rejects the old "genre" field and invalid values', async () => {
      await createMovie({ name: 'X', year: 2000, genre: 'Drama' }).expect(400);
      await createMovie({ name: 'X', year: 2000, runtimeMinutes: 0 }).expect(
        400,
      );
      await createMovie({
        name: 'X',
        year: 2000,
        posterUrl: 'not-a-url',
      }).expect(400);
      await createMovie({
        name: 'X',
        year: 2000,
        genres: Array.from({ length: 11 }, (_, i) => `g${i}`),
      }).expect(400);
    });
  });

  describe('movies and series share the table', () => {
    it('allows a movie and a series with the same name and year', async () => {
      await createMovie({ name: 'Twin', year: 2020 }).expect(201);
      await createSeries('Twin', 2020);
    });

    it('/movies only returns and addresses movies', async () => {
      const movie = (await createMovie({ name: 'Heat', year: 1995 }))
        .body as TitleBody;
      const series = await createSeries('Dark', 2017);

      const list = (await http().get('/movies').expect(200)).body as Page;
      expect(list.data.map((t) => t.name)).toEqual(['Heat']);
      expect(list.meta.total).toBe(1);

      await http().get(`/movies/${movie.id}`).expect(200);
      await http().get(`/movies/${series.id}`).expect(404);
      await http()
        .patch(`/movies/${series.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2018 })
        .expect(404);
      await http()
        .delete(`/movies/${series.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('GET /titles', () => {
    beforeEach(async () => {
      await createMovie({ name: 'Heat', year: 1995 }).expect(201);
      await createSeries('Dark', 2017);
    });

    it('lists every type by default', async () => {
      const body = (await http().get('/titles').expect(200)).body as Page;

      expect(body.data.map((t) => `${t.type}:${t.name}`)).toEqual([
        'MOVIE:Heat',
        'SERIES:Dark',
      ]);
    });

    it('filters by type', async () => {
      const body = (await http().get('/titles?type=SERIES').expect(200))
        .body as Page;

      expect(body.data.map((t) => t.name)).toEqual(['Dark']);
      expect(body.meta.total).toBe(1);
    });

    it('rejects an unknown type', async () => {
      await http().get('/titles?type=BOOK').expect(400);
    });

    it('returns a title of any type by id', async () => {
      const dark = (await http().get('/titles?type=SERIES')).body as Page;

      const res = await http().get(`/titles/${dark.data[0].id}`).expect(200);
      expect((res.body as TitleBody).type).toBe('SERIES');
      await http().get('/titles/999').expect(404);
    });
  });
});
