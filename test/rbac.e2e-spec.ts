import { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
  registerAdminAndLogin,
  registerAndLogin,
  resetDatabase,
  setRole,
} from './utils/test-app';

const ANA = { name: 'Ana', email: 'ana@teste.com', password: '123123' };
const LUCAS = { name: 'Lucas', email: 'lucas@teste.com', password: '123123' };

type Paginated = {
  data: { id: number; email: string; role: string }[];
  meta: { total: number };
};

describe('Roles and ownership (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users', () => {
    it('lists users for admins, without password hashes', async () => {
      const admin = await registerAdminAndLogin(app);
      await registerAndLogin(app, ANA);

      const res = await http()
        .get('/users?limit=10')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      const body = res.body as Paginated;
      expect(body.meta.total).toBe(2);
      expect(body.data.map((u) => u.role)).toEqual(['ADMIN', 'USER']);
      expect(JSON.stringify(body)).not.toContain('password');
    });

    it('forbids regular users with 403', async () => {
      const ana = await registerAndLogin(app, ANA);

      await http()
        .get('/users')
        .set('Authorization', `Bearer ${ana.token}`)
        .expect(403);
    });

    it('caps the page size at 100', async () => {
      const admin = await registerAdminAndLogin(app);

      await http()
        .get('/users?limit=101')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(400);
    });
  });

  describe('GET /users/:id', () => {
    it("forbids reading someone else's account", async () => {
      const ana = await registerAndLogin(app, ANA);
      const lucas = await registerAndLogin(app, LUCAS);

      await http()
        .get(`/users/${ana.id}`)
        .set('Authorization', `Bearer ${lucas.token}`)
        .expect(403);
    });

    it('lets admins read any account', async () => {
      const admin = await registerAdminAndLogin(app);
      const ana = await registerAndLogin(app, ANA);

      const res = await http()
        .get(`/users/${ana.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(res.body).toMatchObject({ email: ANA.email, role: 'USER' });
    });
  });

  describe('DELETE /users/:id', () => {
    it('lets admins delete any account', async () => {
      const admin = await registerAdminAndLogin(app);
      const ana = await registerAndLogin(app, ANA);

      await http()
        .delete(`/users/${ana.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(204);
    });

    it('refuses to delete the last admin with 409', async () => {
      const admin = await registerAdminAndLogin(app);

      await http()
        .delete(`/users/${admin.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(409);
    });
  });

  describe('/me', () => {
    it('returns the own account with its role', async () => {
      const ana = await registerAndLogin(app, ANA);

      const res = await http()
        .get('/me')
        .set('Authorization', `Bearer ${ana.token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: ana.id,
        email: ANA.email,
        role: 'USER',
        avatar: null,
        watchedTitles: [],
      });
    });

    it('updates the own name', async () => {
      const ana = await registerAndLogin(app, ANA);

      const res = await http()
        .patch('/me')
        .set('Authorization', `Bearer ${ana.token}`)
        .send({ name: 'Ana Carol' })
        .expect(200);

      expect((res.body as { name: string }).name).toBe('Ana Carol');
    });

    it('requires a token', async () => {
      await http().get('/me').expect(401);
    });
  });

  describe('role changes', () => {
    it('take effect on the next request, without a new token', async () => {
      const ana = await registerAndLogin(app, ANA);
      const asAna = () =>
        http().get('/users').set('Authorization', `Bearer ${ana.token}`);

      await asAna().expect(403);

      await setRole(app, ana.id, Role.ADMIN);
      await asAna().expect(200);

      await setRole(app, ana.id, Role.USER);
      await asAna().expect(403);
    });
  });
});
