import { Request, Response } from "express";
import { movieService } from "../service/movie.service";
import { validate as isUuid } from "uuid";

export const create = async (req: Request, res: Response) => {
  const { name, genre, director, year } = req.body;

  if (!name || !year) {
    return res.status(400).json({
      message: "The name and year are required.",
    });
  }

  try {
    const newMovie = await movieService.create(name, genre, director, year);
    return res.status(201).json(newMovie);
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const findAll = async (req: Request, res: Response) => {
  try {
    const movies = await movieService.findAll();
    return res.status(201).json(movies);
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const findById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'Param "id" is required.' });
  }

  const idNum = Number(id);
  if (!Number.isInteger(idNum)) {
    return res.status(400).json({ message: 'Param "id" must be an integer.' });
  }

  try {
    const movie = await movieService.findById(idNum);
    if (!movie) {
      return res
        .status(404)
        .json({ message: `Movie with id ${idNum} not found.` });
    }
    return res.status(200).json(movie);
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const update = async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: 'Param "id" is required.' });
  }
  const idNum = Number(id);

  const { name, genre, director, year } = req.body;

  if (!name || !genre || !director || !year) {
    return res
      .status(400)
      .json({ message: "Name, gender, director and year are required" });
  }
  try {
    const updated = await movieService.update(idNum, {
      name,
      genre,
      director,
      year,
    });
    if (!updated)
      return res
        .status(404)
        .json({ message: `Movie with id ${idNum} not found.` });
    return res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const patch = async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: 'Param "id" is required.' });
  }
  const idNum = Number(id);

  const dto: Partial<{
    name: string;
    genre: string;
    director: string;
    year: number;
  }> = {};
  if ("name" in req.body) dto.name = req.body.name;
  if ("genre" in req.body) dto.genre = req.body.genre;
  if ("director" in req.body) dto.director = req.body.director;
  if ("year" in req.body) dto.year = req.body.year;

  try {
    const patched = await movieService.patch(idNum, dto);
    if (!patched) {
      return res
        .status(404)
        .json({ message: `Movie with id ${idNum} not found.` });
    }
    return res.status(200).json(patched);
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const deleteMovie = (req: Request, res: Response) => {
  const id = req.params.id;
  const idNum = Number(id);
  if (!id) {
    return res.status(400).json({ message: 'Param "id" is required.' });
  }

  const deleted = movieService.deleteMovie(idNum);
  if (!deleted)
    return res
      .status(404)
      .json({ message: `Movie with id ${idNum} not found.` });

  return res.status(200).json(deleted);
};

export const deleteAllMovies = async (_req: Request, res: Response) => {
  try {
    const result = await movieService.deleteAllMovies();
    return res.status(200).json({ deleted: result.count });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};
