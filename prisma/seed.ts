/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const movieIds = {
  twenty_one: 1,
  the_godfather: 2,
  the_dark_knight: 3,
  forrest_gump: 4,
  fight_club: 5,
};

const usersSeed = [
  {
    email: 'joao@email.com',
    name: 'Joao',
    passwordHash: '12345',
    movieIds: [movieIds.twenty_one, movieIds.fight_club],
  },
  {
    email: 'maria@email.com',
    name: 'Maria',
    passwordHash: '12345',
    movieIds: [movieIds.the_godfather, movieIds.forrest_gump],
  },
];

async function main() {
  const twenty_one = await prisma.movie.upsert({
    where: { id: movieIds.twenty_one },
    update: {},
    create: {
      name: '21',
      year: 2008,
    },
  });
  const the_godfather = await prisma.movie.upsert({
    where: { id: movieIds.the_godfather },
    update: {},
    create: {
      name: 'The Godfather',
      year: 1972,
    },
  });
  const the_dark_knight = await prisma.movie.upsert({
    where: { id: movieIds.the_dark_knight },
    update: {},
    create: {
      name: 'The Dark Knight',
      year: 2008,
    },
  });
  const forrest_gump = await prisma.movie.upsert({
    where: { id: movieIds.forrest_gump },
    update: {},
    create: {
      name: 'Forrest Gump',
      year: 1994,
    },
  });
  const fight_club = await prisma.movie.upsert({
    where: { id: movieIds.fight_club },
    update: {},
    create: {
      name: 'Fight Club',
      year: 1999,
    },
  });
  for (const u of usersSeed) {
    const connectMovies = u.movieIds.map((id) => ({ id }));

    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        watchedMovies: {
          connect: connectMovies,
        },
      },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash,
        watchedMovies: {
          connect: connectMovies,
        },
      },
    });
  }

  console.log({
    twenty_one,
    the_godfather,
    the_dark_knight,
    forrest_gump,
    fight_club,
  });
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
