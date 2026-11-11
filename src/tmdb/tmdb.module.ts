import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TitlesModule } from '../titles/titles.module';
import { TmdbController } from './tmdb.controller';
import { TmdbClient } from './tmdb.client';
import { TmdbImportService } from './tmdb-import.service';

@Module({
  imports: [PrismaModule, TitlesModule],
  controllers: [TmdbController],
  providers: [TmdbClient, TmdbImportService],
})
export class TmdbModule {}
