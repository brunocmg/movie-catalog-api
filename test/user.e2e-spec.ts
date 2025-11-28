import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app/app.module';
import { MoviesModule } from 'src/movies/movies.module';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import * as dotenv from 'dotenv';
import { PrismaService } from 'src/prisma/prisma.service';
import { execSync } from 'child_process';
import { ConfigModule } from '@nestjs/config';

dotenv.config({ path: '.env.test' });

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  beforeAll(() => {
    execSync(
      'cross-env DATABASE_URL=postgresql://postgres:12345@localhost:5432/catalog npx prisma migrate reset --force',
    );
  });

  beforeEach(async () => {
    execSync(
      'cross-env DATABASE_URL=postgresql://postgres:12345@localhost:5432/catalog npx prisma migrate reset --force',
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
        MoviesModule,
        UsersModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterEach(async () => {
    await prismaService.user.deleteMany();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/users', () => {
    it('/users (POST) - createUser', async () => {
      const createUserDto = {
        name: 'Bruno Gomes',
        email: 'bruno@teste.com',
        password: '123123',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toEqual({
        id: response.body.id,
        name: 'Bruno Gomes',
        email: 'bruno@teste.com',
      });
    });

    it('/users (POST) - weak password', async () => {
      const createUserDto = {
        name: 'Bruno Gomes',
        email: 'bruno@teste.com',
        password: '123',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);
    });

  });
});
