import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
  registerAdminAndLogin,
  resetDatabase,
} from './utils/test-app';

type Page = { data: { name: string; year: number }[]; meta: { total: number } };

describe('Search and filters (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  const http = () => request(app.getHttpServer());

  const create = (url: string, body: object) =>
    http().post(url).set('Authorization', `Bearer ${token}`).send(body);
  const names = async (query: string) =>
    ((await http().get(query).expect(200)).body as Page).data.map(
      (t) => t.name,
    );

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    ({ token } = await registerAdminAndLogin(app));
    await create('/movies', {
      name: 'Fight Club',
      year: 1999,
      genres: ['Drama', 'Thriller'],
    }).expect(201);
    await create('/movies', {
      name: 'Heat',
      year: 1995,
      genres: ['Crime'],
    }).expect(201);
    await create('/movies', {
      name: 'Amélie',
      year: 2001,
      genres: ['Comédia'],
    }).expect(201);
    await create('/series', {
      name: 'Dark',
      year: 2017,
      genres: ['Sci-Fi', 'Drama'],
    }).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('q', () => {
    it('matches part of the name ignoring case', async () => {
      expect(await names('/titles?q=FIGHT')).toEqual(['Fight Club']);
      expect(await names('/titles?q=ea')).toEqual(['Heat']);
    });

    it('is scoped by the route type', async () => {
      expect(await names('/movies?q=a')).toEqual(['Heat', 'Amélie']);
      expect(await names('/series?q=a')).toEqual(['Dark']);
    });

    it('treats wildcards as plain text', async () => {
      expect(await names('/titles?q=%25')).toEqual([]);
      expect(await names('/titles?q=_')).toEqual([]);
    });

    it('rejects an empty or too long term', async () => {
      await http().get('/titles?q=').expect(400);
      await http()
        .get(`/titles?q=${'a'.repeat(101)}`)
        .expect(400);
    });
  });

  describe('genre', () => {
    it('filters by slug or by name, ignoring case and accents', async () => {
      expect(await names('/titles?genre=drama')).toEqual([
        'Fight Club',
        'Dark',
      ]);
      expect(await names('/titles?genre=Sci-Fi')).toEqual(['Dark']);
      expect(await names('/titles?genre=comedia')).toEqual(['Amélie']);
    });

    it('combines with type and returns nothing for an unknown genre', async () => {
      expect(await names('/movies?genre=drama')).toEqual(['Fight Club']);
      expect(await names('/titles?genre=western')).toEqual([]);
    });
  });

  describe('year', () => {
    it('filters by exact year and by range', async () => {
      expect(await names('/titles?year=1999')).toEqual(['Fight Club']);
      expect(await names('/titles?yearFrom=1999')).toEqual([
        'Fight Club',
        'Amélie',
        'Dark',
      ]);
      expect(await names('/titles?yearTo=1999')).toEqual([
        'Fight Club',
        'Heat',
      ]);
      expect(await names('/titles?yearFrom=1996&yearTo=2001')).toEqual([
        'Fight Club',
        'Amélie',
      ]);
    });

    it('rejects out-of-range years', async () => {
      await http().get('/titles?year=1800').expect(400);
      await http().get('/titles?yearFrom=abc').expect(400);
    });
  });

  describe('sorting', () => {
    it('sorts by name, year and creation date in both directions', async () => {
      expect(await names('/titles?sortBy=name')).toEqual([
        'Amélie',
        'Dark',
        'Fight Club',
        'Heat',
      ]);
      expect(await names('/titles?sortBy=year&order=desc')).toEqual([
        'Dark',
        'Amélie',
        'Fight Club',
        'Heat',
      ]);
      expect(await names('/titles?sortBy=createdAt&order=desc')).toEqual([
        'Dark',
        'Amélie',
        'Heat',
        'Fight Club',
      ]);
      expect(await names('/titles?order=desc')).toEqual([
        'Dark',
        'Amélie',
        'Heat',
        'Fight Club',
      ]);
    });

    it('rejects unknown fields', async () => {
      await http().get('/titles?sortBy=password').expect(400);
      await http().get('/titles?order=sideways').expect(400);
    });
  });

  it('combines filters and keeps the total and pagination consistent', async () => {
    const res = (
      await http()
        .get('/titles?genre=drama&yearFrom=1990&sortBy=year&order=desc&limit=1')
        .expect(200)
    ).body as Page;

    expect(res.data.map((t) => t.name)).toEqual(['Dark']);
    expect(res.meta.total).toBe(2);

    const next = (
      await http()
        .get(
          '/titles?genre=drama&yearFrom=1990&sortBy=year&order=desc&limit=1&offset=1',
        )
        .expect(200)
    ).body as Page;
    expect(next.data.map((t) => t.name)).toEqual(['Fight Club']);
  });
});
