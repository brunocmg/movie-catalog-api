// import { deleteAllMovies } from "../controllers/movie.controller";
import { Movie } from "../models/movie.model";
import { PrismaClient } from "../generated/prisma";
import { prisma } from "../lib/prisma";

class MovieService {
  public async create(
    name: string,
    genre: string,
    director: string,
    year: number
  ) {
    const newMovie = await prisma.movie.create({
      data: { name, genre, director, year },
    });

    return newMovie;
  }

  public async findAll() {
    return prisma.movie.findMany({ orderBy: { id: "asc" } });
  }

  public async findById(id: number) {
    return prisma.movie.findFirst({ where: { id: id } });
  }

  public async update(
    id: number,
    dto: { name: string; genre: string; director: string; year: number }
  ) {
    const index = await prisma.movie.findUnique({ where: { id: id } });
    if (!index) return undefined;

    const updated = {
      id,
      name: dto.name,
      genre: dto.genre,
      director: dto.director,
      year: dto.year,
    };
    return prisma.movie.update({ where: { id }, data: dto });
  }

  public async patch(
    id: number,
    dto: Partial<{ name: string; genre: string; director: string; year: number }>
  ) {
    const index = await prisma.movie.findUnique({ where: { id: id } });
    if (!index) return undefined;

    return prisma.movie.update({
      where: { id },
      data: dto
    });
  }

  // public deleteMovie(id: string): Movie | undefined {
  //   const index = this.movies.findIndex((m) => m.id === id);
  //   if (index === -1) return undefined;

  //   const [removed] = this.movies.splice(index, 1);
  //   return removed;
  // }

  // public deleteAllMovies(): void {
  //   this.movies.length = 0;
  // }
}

export const movieService = new MovieService();
