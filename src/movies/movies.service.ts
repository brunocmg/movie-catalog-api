import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseMovieDto } from './dto/response-movie.dto';
import { PaginationDto } from './dto/pagination.dto';
import { PaginatedMoviesDto } from './dto/paginated-movies.dto';

type PrismaKnownRequestError = {
  name: 'PrismaClientKnownRequestError';
};

@Injectable()
export class MoviesService {
  constructor(private prisma: PrismaService) {}
  async create(createMovieDto: CreateMovieDto): Promise<ResponseMovieDto> {
    try {
      const newMovie = await this.prisma.movie.create({
        data: {
          name: createMovieDto.name,
          genre: createMovieDto.genre,
          director: createMovieDto.director,
          year: createMovieDto.year,
        },
      });
      return newMovie;
    } catch (err) {
      console.error(err);
      if (this.isPrismaKnownRequestError(err)) throw err;
      throw new InternalServerErrorException('Movie registration failed.');
    }
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginatedMoviesDto> {
    try {
      const { limit = 10, offset = 0 } = paginationDto;

      const [allMovies, total] = await this.prisma.$transaction([
        this.prisma.movie.findMany({
          orderBy: { id: 'asc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.movie.count(),
      ]);

      return {
        data: allMovies,
        meta: {
          limit,
          offset,
          total,
        },
      };
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to find movies.');
    }
  }

  async findOne(id: number): Promise<ResponseMovieDto> {
    const movie = await this.prisma.movie.findFirst({ where: { id } });
    if (movie) return movie;

    throw new NotFoundException('Movie not found.');
  }

  async update(
    id: number,
    updateMovieDto: UpdateMovieDto,
  ): Promise<ResponseMovieDto> {
    const findMovie = await this.prisma.movie.findFirst({ where: { id } });

    if (!findMovie) {
      throw new NotFoundException('Movie not found.');
    }

    const movie = await this.prisma.movie.update({
      where: { id: findMovie.id },
      data: {
        name: updateMovieDto.name ?? findMovie.name,
        genre: updateMovieDto.genre ?? findMovie.genre,
        director: updateMovieDto.director ?? findMovie.director,
        year: updateMovieDto.year ?? findMovie.year,
      },
    });

    return movie;
  }

  async remove(id: number) {
    try {
      const findMovie = await this.prisma.movie.findFirst({ where: { id } });

      if (!findMovie) throw new NotFoundException('Movie not found.');

      const deleted = await this.prisma.movie.delete({
        where: { id: findMovie.id },
      });

      return deleted;
    } catch (err) {
      console.error(err);
      if (this.isPrismaKnownRequestError(err)) throw err;
      throw new InternalServerErrorException('Failed to delete movie.');
    }
  }

  private isPrismaKnownRequestError(
    error: unknown,
  ): error is PrismaKnownRequestError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as PrismaKnownRequestError).name ===
        'PrismaClientKnownRequestError'
    );
  }
}
