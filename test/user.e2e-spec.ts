import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app';

type UserBody = {
  id: number;
  name: string;
  email: string;
  watchedMovies: string[];
};

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

  describe('POST /auth', () => {
    it('logs in regardless of the e-mail casing', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Ana', email: 'ana@teste.com', password: '123123' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth')
        .send({ email: 'ANA@Teste.com', password: '123123' })
        .expect(201);

      expect(res.body).toHaveProperty('token');
    });

    it('rejects a wrong password with 401', async () => {
      await registerAndLogin(app, {
        name: 'Ana',
        email: 'ana@teste.com',
        password: '123123',
      });

      await request(app.getHttpServer())
        .post('/auth')
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
        watchedMovies: [],
      });
    });

    it('requires a token', async () => {
      await request(app.getHttpServer())
        .patch('/users/1')
        .send({ name: 'X' })
        .expect(401);
    });
  });

  describe('DELETE /users/:id', () => {
    it('deletes the own user', async () => {
      const auth = await registerAndLogin(app, {
        name: 'Lucas',
        email: 'lucas@teste.com',
        password: '123123',
      });

      const res = await request(app.getHttpServer())
        .delete(`/users/${auth.id}`)
        .set('Authorization', `Bearer ${auth.token}`)
        .expect(200);

      expect((res.body as { message: string }).message).toBe(
        'Usuário foi deletado com sucesso!',
      );
    });
  });
});
