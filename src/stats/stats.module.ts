import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [PrismaModule],
  controllers: [StatsController],
  providers: [StatsService, RecommendationsService],
})
export class StatsModule {}
