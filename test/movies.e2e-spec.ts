import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
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
    const auth = await registerAndLogin(app, {
      name: 'Bruno',
      email: 'bruno@teste.com',
      password: '123123',
    });
    token = auth.token;
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
    await request(app.getHttpServer()).get('/movies/999').expect(404);
  });

  it('requires a token to create', async () => {
    await request(app.getHttpServer())
      .post('/movies')
      .send({ name: 'X', year: 2000 })
      .expect(401);
  });
});
