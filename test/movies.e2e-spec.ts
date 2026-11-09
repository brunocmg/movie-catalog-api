import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
  registerAdminAndLogin,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app';

type MovieBody = {
  id: number;
  name: string;
  year: number;
  createdAt: string;
  updatedAt: string;
};

describe('Movies (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  const createMovie = (body: object) =>
    request(app.getHttpServer())
      .post('/movies')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

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

  it('creates a movie with audit timestamps', async () => {
    const res = await createMovie({ name: 'Fight Club', year: 1999 }).expect(
      201,
    );
    const body = res.body as MovieBody;

    expect(body).toMatchObject({ name: 'Fight Club', year: 1999 });
    expect(Date.parse(body.createdAt)).not.toBeNaN();
    expect(Date.parse(body.updatedAt)).not.toBeNaN();
  });

  it('rejects a duplicated movie (same name and year) with 409', async () => {
    await createMovie({ name: 'Dune', year: 2021 }).expect(201);
    await createMovie({ name: 'Dune', year: 2021 }).expect(409);
  });

  it('allows the same name in a different year', async () => {
    await createMovie({ name: 'Dune', year: 1984 }).expect(201);
    await createMovie({ name: 'Dune', year: 2021 }).expect(201);
  });

  it('bumps updatedAt on update', async () => {
    const created = (await createMovie({ name: 'Heat', year: 1995 }))
      .body as MovieBody;

    const res = await request(app.getHttpServer())
      .patch(`/movies/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ director: 'Michael Mann' })
      .expect(200);

    const updated = res.body as MovieBody;
    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(
      Date.parse(created.updatedAt),
    );
  });

  it('lists movies with pagination metadata', async () => {
    await createMovie({ name: 'A', year: 2000 }).expect(201);
    await createMovie({ name: 'B', year: 2001 }).expect(201);
    await createMovie({ name: 'C', year: 2002 }).expect(201);

    const res = await request(app.getHttpServer())
      .get('/movies?limit=2&offset=1')
      .expect(200);

    expect(res.body).toMatchObject({
      data: [{ name: 'B' }, { name: 'C' }],
      meta: { limit: 2, offset: 1, total: 3 },
    });
  });

  it('returns 404 for a missing movie', async () => {
    const res = await request(app.getHttpServer())
      .get('/movies/999')
      .expect(404);

    expect(res.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Movie not found',
      path: '/movies/999',
    });
  });

  it('returns 409 when an update collides with another movie', async () => {
    await createMovie({ name: 'Dune', year: 2021 }).expect(201);
    const other = (await createMovie({ name: 'Dune', year: 1984 }))
      .body as MovieBody;

    await request(app.getHttpServer())
      .patch(`/movies/${other.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ year: 2021 })
      .expect(409);
  });

  it('returns 404 when updating a missing movie', async () => {
    await request(app.getHttpServer())
      .patch('/movies/999')
      .set('Authorization', `Bearer ${token}`)
      .send({ year: 2000 })
      .expect(404);
  });

  it('deletes with 204, then 404', async () => {
    const movie = (await createMovie({ name: 'Heat', year: 1995 }))
      .body as MovieBody;

    const del = () =>
      request(app.getHttpServer())
        .delete(`/movies/${movie.id}`)
        .set('Authorization', `Bearer ${token}`);

    await del().expect(204);
    await del().expect(404);
  });

  it.each([
    ['POST', '/movies'],
    ['PATCH', '/movies/1'],
    ['DELETE', '/movies/1'],
  ])('forbids regular users on %s %s with 403', async (method, url) => {
    const user = await registerAndLogin(app, {
      name: 'Ana',
      email: 'ana@teste.com',
      password: '123123',
    });
    await createMovie({ name: 'Heat', year: 1995 }).expect(201);

    const res = await request(app.getHttpServer())
      [method.toLowerCase() as 'post' | 'patch' | 'delete'](url)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'X', year: 2000 })
      .expect(403);

    expect((res.body as { message: string }).message).toBe(
      'You do not have permission for this action',
    );
  });

  it('lets anyone read the catalog without a token', async () => {
    const movie = (await createMovie({ name: 'Heat', year: 1995 }))
      .body as MovieBody;

    await request(app.getHttpServer()).get('/movies').expect(200);
    await request(app.getHttpServer()).get(`/movies/${movie.id}`).expect(200);
  });

  it('requires a token to create', async () => {
    await request(app.getHttpServer())
      .post('/movies')
      .send({ name: 'X', year: 2000 })
      .expect(401);
  });
});
