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
      throw new HttpException("Task registration failed.", HttpStatus.BAD_REQUEST)
    }
  }

  async findAll() {
    try {
      const allTasks = await this.prisma.movie.findMany()
      return allTasks
    }catch(err){
      console.log(err)
      throw new HttpException('Failed to find tasks.', HttpStatus.BAD_REQUEST);
    }
  }

  async findOne(id: number) {
      const task = await this.prisma.movie.findFirst({ where: {id: id}})
      if (task?.name) return task

      throw new HttpException('Failed to find task.', HttpStatus.BAD_REQUEST);
  }

  async update(id: number, updateMovieDto: UpdateMovieDto) {
    const findTask = await this.prisma.movie.findFirst({ where: { id: id } });

    if (!findTask) {
      throw new HttpException('This task does not exist', HttpStatus.NOT_FOUND);
    }

    const task = await this.prisma.movie.update({
      where: {id: findTask.id},
      data: {
        name: updateMovieDto.name ? updateMovieDto.name : findTask.name,
        genre: updateMovieDto.genre ? updateMovieDto.genre : findTask.genre,
        director: updateMovieDto.director ? updateMovieDto.director : findTask.director,
        year: updateMovieDto.year ? updateMovieDto.year : findTask.year
      }
    })
    return task
  }

  remove(id: number) {
    return `This action removes a #${id} movie`;
  }
}
