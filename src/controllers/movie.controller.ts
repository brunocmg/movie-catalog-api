import { Request, Response } from 'express';
import { movieService } from '../service/movie.service';

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