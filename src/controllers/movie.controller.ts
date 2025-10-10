import { Request, Response } from 'express';
import { movieService } from '../service/movie.service';
import { validate as isUuid } from "uuid";

export const findAll = (req: Request, res: Response) => {
  const movies = movieService.findAll();

  return res.status(200).json(movies);
};

export const create = (req: Request, res: Response) => {  
  const {name, genre, year} = req.body;

  if (!name || !genre || !year){
    return res.status(400).json({ message: 'Todos os campos (name, genre, year) são obrigatórios.'})
  }

  const newMovie = movieService.create(name, genre, year);

  return res.status(201).json(newMovie);
}

export const findById = (req: Request, res: Response) => {
  const id = req.params.id
  if (!id) {
    return res.status(400).json({ message: 'Param "id" is required.' });
  }

  if (!isUuid(id))
    return res.status(400).json({ message: "Invalid id format" });

  const movie = movieService.findById(id);

  if (!movie) {
    return res.status(404).json({ message: `Movie with id ${id} not found.` });
  }

  return res.status(200).json(movie);
}