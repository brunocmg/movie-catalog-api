import { Movie } from "../models/movie.model";

class MovieService {
  private movies: Movie[] = [
    {
      id: "6f709089-b430-4595-b286-8d49b5e5233d",
      name: "Vingadores: Ultimato",
      genre: "Ação/Aventura",
      year: 2019,
    },
    {
      id: "32599e52-c651-4861-a035-7142b694c25f",
      name: "O Poderoso Chefão",
      genre: "Drama/Crime",
      year: 1972,
    },
    {
      id: "c865764d-5334-4513-8b7a-62425c277e90",
      name: "Interestelar",
      genre: "Ficção Científica/Drama",
      year: 2014,
    },
  ];

  public create(name: string, genre: string, year: number): Movie {
    const id = crypto.randomUUID();
    const newMovie: Movie = {
      id,
      name,
      genre,
      year,
    };

    this.movies.push(newMovie);

    return newMovie;
  }

  public findAll(): Movie[] {
    return this.movies;
  }

  public findById(id: string): Movie | undefined {
    return this.movies.find((m) => m.id === id);
  }

  public update(
    id: string,
    dto: { name: string; genre: string; year: number }
  ): Movie | undefined {
    const index = this.movies.findIndex((m) => m.id === id);
    if (index === -1) return undefined;

    const updated: Movie = {
      id,
      name: dto.name,
      genre: dto.genre,
      year: dto.year,
    };
    this.movies[index] = updated;
    return updated;
  }

  public patch(
    id: string,
    dto: Partial<{ name: string; genre: string; year: string }>
  ): Movie | undefined {
    const index = this.movies.findIndex((m) => m.id === id);
    if (index === -1) return undefined;

    const existing = this.movies[index];
    if (!existing) return undefined;

    const merged: Movie = {
      id: existing.id,
      name: dto.name !== undefined ? dto.name : existing.name,
      genre: dto.genre !== undefined ? dto.genre : existing.genre,
      year:
        dto.year !== undefined
          ? (dto.year as unknown as number)
          : existing.year,
    };

    this.movies[index] = merged;
    return merged;
  }
}

export const movieService = new MovieService();
