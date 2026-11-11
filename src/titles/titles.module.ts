import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TitlesController } from './titles.controller';
import { TitlesService } from './titles.service';
import { GenresService } from './genres.service';

@Module({
  imports: [PrismaModule],
  controllers: [TitlesController],
  providers: [TitlesService, GenresService],
  exports: [TitlesService],
})
export class TitlesModule {}
