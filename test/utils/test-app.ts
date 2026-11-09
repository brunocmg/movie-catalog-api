import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app/app.module';
import { setupApp } from '../../src/app/app.setup';
import { PrismaService } from '../../src/prisma/prisma.service';

export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  setupApp(app);
  await app.init();
  return app;
}

/** Wipes every table between tests (the test database is disposable). */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "watched_movies", "users", "movies" RESTART IDENTITY CASCADE',
  );
}

export type TestUser = { name: string; email: string; password: string };

/** Registers a user, promotes it straight in the database and logs in. */
export async function registerAdminAndLogin(
  app: INestApplication<App>,
  user: TestUser = {
    name: 'Admin',
    email: 'admin@teste.com',
    password: 'admin123',
  },
): Promise<{ id: number; token: string }> {
  const auth = await registerAndLogin(app, user);
  await setRole(app, auth.id, Role.ADMIN);
  return auth;
}

export async function setRole(
  app: INestApplication,
  id: number,
  role: Role,
): Promise<void> {
  await app.get(PrismaService).user.update({ where: { id }, data: { role } });
}

export async function registerAndLogin(
  app: INestApplication<App>,
  user: TestUser,
): Promise<{ id: number; token: string }> {
  await request(app.getHttpServer()).post('/users').send(user).expect(201);

  const res = await request(app.getHttpServer())
    .post('/auth')
    .send({ email: user.email, password: user.password })
    .expect(201);

  return res.body as { id: number; token: string };
}
