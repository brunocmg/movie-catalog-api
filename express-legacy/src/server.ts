import express from "express";
import "dotenv/config";
import {
  findAll as findAllMovies,
  create as createMovie,
  findById as findMovieById,
  update as updateMovie,
  patch as updatePartialMovie,
  deleteMovie as deleteMovie,
  deleteAllMovies as deleteAllMovies,
} from "./controllers/movie.controller";

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/movies", findAllMovies);
app.post("/movies", createMovie);
app.get("/movies/:id", findMovieById);
app.put("/movies/:id", updateMovie);
app.patch("/movies/:id", updatePartialMovie);
app.delete("/movies/:id", deleteMovie);
app.delete("/movies", deleteAllMovies);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
