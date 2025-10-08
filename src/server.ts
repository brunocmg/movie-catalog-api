import express from 'express';
import { findAll as findAllMovies} from './controllers/movie.controller';

const app = express();
const PORT = 3000;

app.use(express.json());
app.get('/movies', findAllMovies);

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

