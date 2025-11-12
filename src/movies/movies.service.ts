import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MoviesService {
  constructor(private prisma: PrismaService) {}
  async create(createMovieDto: CreateMovieDto) {
    try{
      const newMovie = await this.prisma.movie.create({
        data: {
          name: createMovieDto.name,
          genre: createMovieDto.genre,
          director: createMovieDto.director,
          year: createMovieDto.year
        }
      })
      return newMovie
    
    }catch(err){
      console.log(err)
      throw new HttpException("Movie registration failed.", HttpStatus.BAD_REQUEST)
    }
  }

  async findAll() {
    try {
      const allMovies = await this.prisma.movie.findMany({ orderBy: { id: 'asc' } })
      return allMovies
    }catch(err){
      console.log(err)
      throw new HttpException('Failed to find movies.', HttpStatus.BAD_REQUEST);
    }
  }

  async findOne(id: number) {
      const movie = await this.prisma.movie.findFirst({ where: {id: id}})
      if (movie?.name) return movie

      throw new HttpException('Failed to find movie.', HttpStatus.BAD_REQUEST);
  }

  async update(id: number, updateMovieDto: UpdateMovieDto) {
    const findMovie = await this.prisma.movie.findFirst({ where: { id: id } });

    if (!findMovie) {
      throw new HttpException('This movie does not exist', HttpStatus.NOT_FOUND);
    }

    const movie = await this.prisma.movie.update({
      where: {id: findMovie.id},
      data: {
        name: updateMovieDto.name ? updateMovieDto.name : findMovie.name,
        genre: updateMovieDto.genre ? updateMovieDto.genre : findMovie.genre,
        director: updateMovieDto.director ? updateMovieDto.director : findMovie.director,
        year: updateMovieDto.year ? updateMovieDto.year : findMovie.year
      }
    })
    return movie
  }

  async remove(id: number) {
    try {
      const findMovie = await this.prisma.movie.findFirst({ where: { id: id } });

      if (!findMovie) throw new HttpException('This movie does not exist', HttpStatus.NOT_FOUND);

      await this.prisma.movie.delete({where: {id: findMovie.id}})

      return {message: 'Movie deleted'}

    } catch (err) {
      console.log(err);
      throw new HttpException('Failed to delete movie.', HttpStatus.BAD_REQUEST);
    }
  }
}
