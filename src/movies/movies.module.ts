import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TitlesModule } from '../titles/titles.module';
import { MoviesController } from './movies.controller';

@Module({
  imports: [PrismaModule, TitlesModule],
  controllers: [MoviesController],
})
export class MoviesModule {}
