import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TitlesModule } from '../titles/titles.module';
import { SeriesController } from './series.controller';
import { SeasonsController } from './seasons.controller';
import { EpisodesController } from './episodes.controller';
import { SeasonsService } from './seasons.service';

@Module({
  imports: [PrismaModule, TitlesModule],
  controllers: [SeriesController, SeasonsController, EpisodesController],
  providers: [SeasonsService],
})
export class SeriesModule {}
