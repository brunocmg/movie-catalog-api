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

  // public patch(
  //   id: string,
  //   dto: Partial<{ name: string; genre: string; year: string }>
  // ): Movie | undefined {
  //   const index = this.movies.findIndex((m) => m.id === id);
  //   if (index === -1) return undefined;

  //   const existing = this.movies[index];
  //   if (!existing) return undefined;

  //   const merged: Movie = {
  //     id: existing.id,
  //     name: dto.name !== undefined ? dto.name : existing.name,
  //     genre: dto.genre !== undefined ? dto.genre : existing.genre,
  //     year:
  //       dto.year !== undefined
  //         ? (dto.year as unknown as number)
  //         : existing.year,
  //   };

  //   this.movies[index] = merged;
  //   return merged;
  // }

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
