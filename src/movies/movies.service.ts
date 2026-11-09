import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isPrismaKnownError, PrismaErrorCode } from '../prisma/prisma-errors';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { ResponseMovieDto } from './dto/response-movie.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedMoviesDto } from './dto/paginated-movies.dto';

@Injectable()
export class MoviesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMovieDto: CreateMovieDto): Promise<ResponseMovieDto> {
    try {
      return await this.prisma.movie.create({
        data: {
          name: createMovieDto.name,
          genre: createMovieDto.genre,
          director: createMovieDto.director,
          year: createMovieDto.year,
        },
      });
    } catch (err) {
      throw this.translate(err);
    }
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginatedMoviesDto> {
    const { limit = 10, offset = 0 } = paginationDto;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.movie.findMany({
        orderBy: { id: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.movie.count(),
    ]);

    return { data, meta: { limit, offset, total } };
  }

  async findOne(id: number): Promise<ResponseMovieDto> {
    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundException('Movie not found');
    return movie;
  }

  async update(
    id: number,
    updateMovieDto: UpdateMovieDto,
  ): Promise<ResponseMovieDto> {
    try {
      return await this.prisma.movie.update({
        where: { id },
        data: {
          name: updateMovieDto.name,
          genre: updateMovieDto.genre,
          director: updateMovieDto.director,
          year: updateMovieDto.year,
        },
      });
    } catch (err) {
      throw this.translate(err);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.movie.delete({ where: { id } });
    } catch (err) {
      throw this.translate(err);
    }
  }

  private translate(err: unknown): unknown {
    if (isPrismaKnownError(err, PrismaErrorCode.RecordNotFound)) {
      return new NotFoundException('Movie not found');
    }
    if (isPrismaKnownError(err, PrismaErrorCode.UniqueConstraint)) {
      return new ConflictException(
        'A movie with this name and year already exists',
      );
    }
    return err;
  }
}
