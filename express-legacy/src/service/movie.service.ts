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
    return prisma.movie.findUnique({ where: { id: id } });
  }

  public async update(
    id: number,
    dto: { name: string; genre: string; director: string; year: number }
  ) {
    const index = await prisma.movie.findUnique({ where: { id: id } });
    if (!index) return undefined;

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

  public async deleteMovie(id: number) {
    const index = await prisma.movie.findUnique({ where: { id: id } });
    if (!index) return undefined;

    return await prisma.movie.delete({where: {id: index.id}});
  }

  public async deleteAllMovies() {
    return await prisma.movie.deleteMany()
  }
}

export const movieService = new MovieService();
