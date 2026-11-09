import { AUTH_LIMIT } from './utils/strict-throttle-env';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, resetDatabase } from './utils/test-app';

describe('Security (e2e)', () => {
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

  describe('rate limiting', () => {
    it(`blocks login after ${AUTH_LIMIT} attempts per window with 429`, async () => {
      const attempt = () =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'nobody@teste.com', password: 'wrong-pass' });

      for (let i = 0; i < AUTH_LIMIT; i++) {
        await attempt().expect(401);
      }

      const res = await attempt().expect(429);
      expect(res.body).toMatchObject({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Too many requests, please try again later',
      });
      expect(res.headers['retry-after-auth']).toBeDefined();
    });

    it('does not apply the strict limit to regular routes', async () => {
      for (let i = 0; i < AUTH_LIMIT + 2; i++) {
        await request(app.getHttpServer()).get('/movies').expect(200);
      }
    });

    it('never throttles the health check', async () => {
      for (let i = 0; i < AUTH_LIMIT + 2; i++) {
        const res = await request(app.getHttpServer()).get('/health');
        expect(res.status).not.toBe(429);
      }
    });
  });

  describe('request id', () => {
    const UUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

    it('generates one per request', async () => {
      const a = await request(app.getHttpServer()).get('/movies');
      const b = await request(app.getHttpServer()).get('/movies');

      expect(a.headers['x-request-id']).toMatch(UUID);
      expect(b.headers['x-request-id']).not.toBe(a.headers['x-request-id']);
    });

    it('keeps a safe id sent by the client or a proxy', async () => {
      const res = await request(app.getHttpServer())
        .get('/movies')
        .set('X-Request-Id', 'trace-abc_123');

      expect(res.headers['x-request-id']).toBe('trace-abc_123');
    });

    it('replaces an unsafe id', async () => {
      const res = await request(app.getHttpServer())
        .get('/movies')
        .set('X-Request-Id', 'x'.repeat(65));

      expect(res.headers['x-request-id']).toMatch(UUID);
    });

    it('returns the same id in error bodies', async () => {
      const res = await request(app.getHttpServer())
        .get('/movies/999')
        .expect(404);

      expect((res.body as { requestId: string }).requestId).toBe(
        res.headers['x-request-id'],
      );
    });
  });

  describe('HTTP headers', () => {
    it('sends security headers and hides the framework', async () => {
      const res = await request(app.getHttpServer()).get('/movies');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('allows only the configured CORS origin', async () => {
      const allowed = await request(app.getHttpServer())
        .get('/movies')
        .set('Origin', 'https://front.example.com');
      expect(allowed.headers['access-control-allow-origin']).toBe(
        'https://front.example.com',
      );

      const other = await request(app.getHttpServer())
        .get('/movies')
        .set('Origin', 'https://evil.example.com');
      expect(other.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('input limits', () => {
    it('rejects passwords longer than 72 characters', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'A', email: 'a@teste.com', password: 'x'.repeat(73) })
        .expect(400);
    });

    it('rejects ids outside the integer range with 400, not 500', async () => {
      await request(app.getHttpServer()).get('/movies/99999999999').expect(400);
    });
  });
});
