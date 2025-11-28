import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseMovieDto } from './dto/response-movie.dto';

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
      if ((err as any)?.name === 'PrismaClientKnownRequestError') throw err;
      throw new InternalServerErrorException('Movie registration failed.');
    }
  }

  async findAll(): Promise<ResponseMovieDto[]> {
    try {
      const allMovies = await this.prisma.movie.findMany({
        orderBy: { id: 'asc' },
      });
      return allMovies;
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
      if ((err as any)?.name === 'PrismaClientKnownRequestError') throw err;
      throw new InternalServerErrorException('Failed to delete movie.');
    }
  }
}
