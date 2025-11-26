import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app/app.module';
import { MoviesModule } from 'src/movies/movies.module';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import * as dotenv from 'dotenv'
import { PrismaService } from 'src/prisma/prisma.service';

dotenv.config({path: '.env.test'})

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MoviesModule,
        UsersModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => { });
});
