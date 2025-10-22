import { Request, Response } from "express";
import { movieService } from "../service/movie.service";
import { validate as isUuid } from "uuid";

// export const findAll = (req: Request, res: Response) => {
//   const movies = movieService.findAll();

//   return res.status(200).json(movies);
// };

export const create = async (req: Request, res: Response) => {
  const { name, genre, director, year } = req.body;

  if (!name || !year) {
    return res.status(400).json({
      message: "O campo de nome e ano são obrigatórios.",
    });
  }

  try {
    const newMovie = await movieService.create(name, genre, director, year);
    return res.status(201).json(newMovie);
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

// export const findById = (req: Request, res: Response) => {
//   const id = req.params.id;
//   if (!id) {
//     return res.status(400).json({ message: 'Param "id" is required.' });
//   }
//   if (!isUuid(id))
//     return res.status(400).json({ message: "Invalid id format" });
//   const movie = movieService.findById(id);
//   if (!movie) {
//     return res.status(404).json({ message: `Movie with id ${id} not found.` });
//   }
//   return res.status(200).json(movie);
// };

// export const update = (req: Request, res: Response) => {
//   const id = req.params.id;
//   if (!id) {
//     return res.status(400).json({ message: 'Param "id" is required.' });
//   }
//   if (!isUuid(id))
//     return res.status(400).json({ message: "Invalid id format" });

//   const { name, genre, year } = req.body;

//   if (!name || !genre || !year) {
//     return res
//       .status(400)
//       .json({ message: "Name, gender and year are required" });
//   }

//   const updated = movieService.update(id, { name, genre, year });
//   if (!update) return res.status(404).json({ message: "Not found" });
//   return res.status(200).json(updated);
// };

// export const patch = (req: Request, res: Response) => {
//   const id = req.params.id;
//   if (!id) {
//     return res.status(400).json({ message: 'Param "id" is required.' });
//   }
//   if (!isUuid(id))
//     return res.status(400).json({ message: "Invalid id format" });

//   const dto: Partial<{ name: string; genre: string; year: string }> = {};
//   if ("name" in req.body) dto.name = req.body.name;
//   if ("genre" in req.body) dto.genre = req.body.genre;
//   if ("year" in req.body) dto.year = req.body.year;

//   const patched = movieService.patch(id, dto);
//   if (!patched) return res.status(404).json({ message: "Not found." });

//   return res.status(200).json(patched);
// };

// export const deleteMovie = (req: Request, res: Response) => {
//   const id = req.params.id;
//   if (!id) {
//     return res.status(400).json({ message: 'Param "id" is required.' });
//   }
//   if (!isUuid(id))
//     return res.status(400).json({ message: "Invalid id format" });

//   const deleted = movieService.deleteMovie(id);
//   if (!deleted) return res.status(404).json({ message: "Not found." });

//   return res.status(200).json(deleted);
// };

// export const deleteAllMovies = (req: Request, res: Response) => {
//   movieService.deleteAllMovies();

//   const removed = movieService.deleteAllMovies();
//   return res.status(200).json(removed);
// };
