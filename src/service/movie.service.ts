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
}

export const movieService = new MovieService();
