import { Request, Response } from 'express';
import { movieService } from '../service/movie.service';

export const findAll = (req: Request, res: Response) => {
  const movies = movieService.findAll();

  return res.status(200).json(movies);
};