import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
  login,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app';

const ANA = { name: 'Ana', email: 'ana@teste.com', password: '123123' };

type Tokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
};

describe('Auth sessions (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  const refresh = (refreshToken: string) =>
    http().post('/auth/refresh').send({ refreshToken });
  const me = (accessToken: string) =>
    http().get('/me').set('Authorization', `Bearer ${accessToken}`);

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('returns the user, an access token and a refresh token', async () => {
      await http().post('/users').send(ANA).expect(201);

      const res = await http()
        .post('/auth/login')
        .send({ email: ANA.email, password: ANA.password })
        .expect(200);

      expect(res.body).toMatchObject({
        user: { email: ANA.email, role: 'USER' },
        tokenType: 'Bearer',
        expiresIn: expect.any(Number) as number,
        accessToken: expect.any(String) as string,
        refreshToken: expect.any(String) as string,
      });
      expect(JSON.stringify(res.body)).not.toContain('password');
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns new tokens that work, and rotates the refresh token', async () => {
      const ana = await registerAndLogin(app, ANA);

      const res = await refresh(ana.refreshToken).expect(200);
      const tokens = res.body as Tokens;

      expect(tokens.refreshToken).not.toBe(ana.refreshToken);
      await me(tokens.accessToken).expect(200);
      await refresh(tokens.refreshToken).expect(200);
    });

    it('rejects an unknown token', async () => {
      await refresh('not-a-real-token').expect(401);
    });

    it('rejects a missing token with 400', async () => {
      await http().post('/auth/refresh').send({}).expect(400);
    });

    it('detects reuse and revokes the whole session', async () => {
      const ana = await registerAndLogin(app, ANA);

      const rotated = (await refresh(ana.refreshToken).expect(200))
        .body as Tokens;

      await refresh(ana.refreshToken).expect(401);

      await refresh(rotated.refreshToken).expect(401);
    });

    it('keeps other sessions alive when one is compromised', async () => {
      const ana = await registerAndLogin(app, ANA);
      const otherDevice = await login(app, ANA);

      await refresh(ana.refreshToken).expect(200);
      await refresh(ana.refreshToken).expect(401); // reuse in session 1

      await refresh(otherDevice.refreshToken).expect(200);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the session and is idempotent', async () => {
      const ana = await registerAndLogin(app, ANA);

      await http()
        .post('/auth/logout')
        .send({ refreshToken: ana.refreshToken })
        .expect(204);
      await http()
        .post('/auth/logout')
        .send({ refreshToken: ana.refreshToken })
        .expect(204);

      await refresh(ana.refreshToken).expect(401);
    });
  });

  describe('POST /auth/logout-all', () => {
    it('revokes every session of the user', async () => {
      const ana = await registerAndLogin(app, ANA);
      const otherDevice = await login(app, ANA);

      await http()
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${ana.token}`)
        .expect(204);

      await refresh(ana.refreshToken).expect(401);
      await refresh(otherDevice.refreshToken).expect(401);
    });

    it('requires an access token', async () => {
      await http().post('/auth/logout-all').expect(401);
    });
  });

  describe('password change', () => {
    it('revokes every refresh token', async () => {
      const ana = await registerAndLogin(app, ANA);

      await http()
        .patch('/me')
        .set('Authorization', `Bearer ${ana.token}`)
        .send({ password: 'new-password' })
        .expect(200);

      await refresh(ana.refreshToken).expect(401);
      await login(app, { email: ANA.email, password: 'new-password' });
    });
  });

  describe('deleted user', () => {
    it('cannot refresh anymore', async () => {
      const ana = await registerAndLogin(app, ANA);

      await http()
        .delete(`/users/${ana.id}`)
        .set('Authorization', `Bearer ${ana.token}`)
        .expect(204);

      await refresh(ana.refreshToken).expect(401);
    });
  });
});
