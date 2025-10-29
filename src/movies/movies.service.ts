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
      throw new HttpException("Falha ao cadastrar tarefa", HttpStatus.BAD_REQUEST)
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

  findOne(id: number) {
    return `This action returns a #${id} movie`;
  }

  update(id: number, updateMovieDto: UpdateMovieDto) {
    return `This action updates a #${id} movie`;
  }

  remove(id: number) {
    return `This action removes a #${id} movie`;
  }
}
