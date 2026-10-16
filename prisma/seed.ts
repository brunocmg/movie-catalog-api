import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '.prisma/client';
import * as bcrypt from 'bcryptjs';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const moviesSeed = {
  twenty_one: { name: '21', year: 2008 },
  the_godfather: { name: 'The Godfather', year: 1972 },
  the_dark_knight: { name: 'The Dark Knight', year: 2008 },
  forrest_gump: { name: 'Forrest Gump', year: 1994 },
  fight_club: { name: 'Fight Club', year: 1999 },
} as const;

type MovieKey = keyof typeof moviesSeed;

const usersSeed: {
  email: string;
  name: string;
  password: string;
  movies: MovieKey[];
}[] = [
  {
    email: 'joao@email.com',
    name: 'Joao',
    password: '123456',
    movies: ['twenty_one', 'fight_club'],
  },
  {
    email: 'maria@email.com',
    name: 'Maria',
    password: '123456',
    movies: ['the_godfather', 'forrest_gump'],
  },
];

async function ensureMovie(data: { name: string; year: number }) {
  const existing = await prisma.movie.findFirst({ where: data });
  return existing ?? (await prisma.movie.create({ data }));
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed de desenvolvimento: não rode em produção.');
  }

  const movieIds = {} as Record<MovieKey, number>;
  for (const key of Object.keys(moviesSeed) as MovieKey[]) {
    const movie = await ensureMovie(moviesSeed[key]);
    movieIds[key] = movie.id;
  }

  for (const u of usersSeed) {
    const passwordHash = await bcrypt.hash(u.password, 10);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash }, // corrige os usuários antigos com senha em texto puro
      create: { email: u.email, name: u.name, passwordHash },
    });

    for (const key of u.movies) {
      await prisma.watchedMovie.upsert({
        where: {
          userId_movieId: { userId: user.id, movieId: movieIds[key] },
        },
        update: {},
        create: { userId: user.id, movieId: movieIds[key] },
      });
    }
  }

  console.log('Seed concluído');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
