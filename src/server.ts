import express from 'express';
import { findAll as findAllMovies, create as createMovie, findById as findMovieById} from './controllers/movie.controller';

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/movies', findAllMovies);
app.post('/movies', createMovie);
app.get('/movies/:id', findMovieById)

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

