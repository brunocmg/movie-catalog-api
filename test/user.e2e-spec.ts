import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { MoviesModule } from '../src/movies/movies.module';
import { UsersModule } from '../src/users/users.module';
import { AuthModule } from '../src/auth/auth.module';
import * as dotenv from 'dotenv';
import { PrismaService } from '../src/prisma/prisma.service';
import { execSync } from 'child_process';
import { ConfigModule } from '@nestjs/config';

dotenv.config({ path: '.env.test' });

interface UserBody {
  id: string;
  name: string;
  email: string;
}

interface AuthBody {
  id: string;
  token: string;
}

interface MessageBody {
  message: string;
}

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  const createAndLogin = async (user: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ created: UserBody; auth: AuthBody }> => {
    const createResponse = await request(app.getHttpServer())
      .post('/users')
      .send(user)
      .expect(201);

    const authResponse = await request(app.getHttpServer())
      .post('/auth')
      .send({ email: user.email, password: user.password });

    return {
      created: createResponse.body as UserBody,
      auth: authResponse.body as AuthBody,
    };
  };

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

      const body = response.body as UserBody;

      expect(body).toEqual({
        id: body.id,
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

    it('/users (PATCH) - update user', async () => {
      const createUserDto = {
        name: 'Ana Carol',
        email: 'ana@teste.com',
        password: '123123',
      };

      const updateUserDto = {
        name: 'Ana Caroline',
      };

      const { auth } = await createAndLogin(createUserDto);

      expect(auth.token).toBeDefined();

      const response = await request(app.getHttpServer())
        .patch(`/users/${auth.id}`)
        .set('Authorization', `Bearer ${auth.token}`)
        .send(updateUserDto)
        .expect(200);

      expect(response.body as UserBody).toEqual({
        id: auth.id,
        name: updateUserDto.name,
        email: createUserDto.email,
      });
    });

    it('/users (DELETE) - delete a user', async () => {
      const createUserDto = {
        name: 'Lucas',
        email: 'lucas@teste.com',
        password: '123123',
      };

      const { created, auth } = await createAndLogin(createUserDto);

      const response = await request(app.getHttpServer())
        .delete(`/users/${created.id}`)
        .set('Authorization', `Bearer ${auth.token}`);

      expect((response.body as MessageBody).message).toEqual(
        'Usuário foi deletado com sucesso!',
      );
    });
  });
});
