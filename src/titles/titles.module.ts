import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { TitlesController } from './titles.controller';
import { TitlesService } from './titles.service';
import { GenresService } from './genres.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [TitlesController],
  providers: [TitlesService, GenresService],
  exports: [TitlesService],
})
export class TitlesModule {}
