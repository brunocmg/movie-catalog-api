import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MyRatingsController, ReviewsController } from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  imports: [PrismaModule],
  controllers: [MyRatingsController, ReviewsController],
  providers: [RatingsService],
})
export class RatingsModule {}
