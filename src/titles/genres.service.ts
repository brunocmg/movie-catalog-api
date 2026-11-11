import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseGenreDto } from './dto/response-genre.dto';

@Injectable()
export class GenresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  findAll(): Promise<ResponseGenreDto[]> {
    return this.cache.wrap('genres:all', () =>
      this.prisma.genre.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true },
      }),
    );
  }
}
