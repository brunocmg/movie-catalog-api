import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ListsController, MyListsController } from './lists.controller';
import { ListsService } from './lists.service';

@Module({
  imports: [PrismaModule],
  controllers: [MyListsController, ListsController],
  providers: [ListsService],
})
export class ListsModule {}
