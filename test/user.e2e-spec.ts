import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
  registerAdminAndLogin,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app';

type UserBody = {
  id: number;
  name: string;
  email: string;
  watchedMovies: string[];
};

const ANA = { name: 'Ana', email: 'ana@teste.com', password: '123123' };
const LUCAS = { name: 'Lucas', email: 'lucas@teste.com', password: '123123' };

describe('Users (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    it('creates a user without exposing the password hash', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Bruno Gomes',
          email: 'bruno@teste.com',
          password: '123123',
        })
        .expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number) as number,
        name: 'Bruno Gomes',
        email: 'bruno@teste.com',
        role: 'USER',
        avatar: null,
        watchedMovies: [],
      });
    });

    it('stores the e-mail trimmed and lower-cased', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Bruno',
          email: '  Bruno@Teste.COM ',
          password: '123123',
        })
        .expect(201);

      expect((res.body as UserBody).email).toBe('bruno@teste.com');
    });

    it('rejects a weak password', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Bruno', email: 'bruno@teste.com', password: '123' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('logs in regardless of the e-mail casing', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Ana', email: 'ana@teste.com', password: '123123' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ANA@Teste.com', password: '123123' })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
    });

    it('rejects a wrong password with 401', async () => {
      await registerAndLogin(app, {
        name: 'Ana',
        email: 'ana@teste.com',
        password: '123123',
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ana@teste.com', password: 'wrong-pass' })
        .expect(401);
    });
  });

  describe('PATCH /users/:id', () => {
    it('updates the own user', async () => {
      const auth = await registerAndLogin(app, {
        name: 'Ana Carol',
        email: 'ana@teste.com',
        password: '123123',
      });

      const res = await request(app.getHttpServer())
        .patch(`/users/${auth.id}`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send({ name: 'Ana Caroline' })
        .expect(200);

      expect(res.body).toEqual({
        id: auth.id,
        name: 'Ana Caroline',
        email: 'ana@teste.com',
        role: 'USER',
        avatar: null,
        watchedMovies: [],
      });
    });

    it('requires a token', async () => {
      await request(app.getHttpServer())
        .patch('/users/1')
        .send({ name: 'X' })
        .expect(401);
    });

    it("returns 403 when changing someone else's account", async () => {
      const ana = await registerAndLogin(app, ANA);
      const lucas = await registerAndLogin(app, LUCAS);

      const res = await request(app.getHttpServer())
        .patch(`/users/${ana.id}`)
        .set('Authorization', `Bearer ${lucas.token}`)
        .send({ name: 'Hacked' })
        .expect(403);

      expect(res.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You can only change your own account',
        path: `/users/${ana.id}`,
      });
    });

    it('rejects an e-mail change with 400', async () => {
      const ana = await registerAndLogin(app, ANA);

      await request(app.getHttpServer())
        .patch(`/users/${ana.id}`)
        .set('Authorization', `Bearer ${ana.token}`)
        .send({ email: 'new@teste.com' })
        .expect(400);
    });
  });

  describe('POST /users (conflicts)', () => {
    it('returns 409 for an e-mail already registered, ignoring case', async () => {
      await registerAndLogin(app, ANA);

      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ ...ANA, email: 'ANA@teste.com' })
        .expect(409);

      expect(res.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
        message: 'E-mail already registered',
      });
    });
  });

  describe('GET /users/:id', () => {
    it('returns 404 for a missing user (admin)', async () => {
      const admin = await registerAdminAndLogin(app);

      const res = await request(app.getHttpServer())
        .get('/users/999')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(404);

      expect((res.body as { message: string }).message).toBe('User not found');
    });

    it('returns 400 for a non-numeric id', async () => {
      const ana = await registerAndLogin(app, ANA);

      await request(app.getHttpServer())
        .get('/users/abc')
        .set('Authorization', `Bearer ${ana.token}`)
        .expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('deletes the own user with 204 and invalidates the token', async () => {
      const lucas = await registerAndLogin(app, LUCAS);

      await request(app.getHttpServer())
        .delete(`/users/${lucas.id}`)
        .set('Authorization', `Bearer ${lucas.token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/users/${lucas.id}`)
        .set('Authorization', `Bearer ${lucas.token}`)
        .expect(401);
    });

    it("returns 403 when deleting someone else's account", async () => {
      const ana = await registerAndLogin(app, ANA);
      const lucas = await registerAndLogin(app, LUCAS);

      await request(app.getHttpServer())
        .delete(`/users/${ana.id}`)
        .set('Authorization', `Bearer ${lucas.token}`)
        .expect(403);
    });
  });
});
