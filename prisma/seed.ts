import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, TitleType } from '.prisma/client';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: `${process.env.DATABASE_URL}` });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const titlesSeed = {
  twenty_one: {
    type: TitleType.MOVIE,
    name: '21',
    year: 2008,
    director: 'Robert Luketic',
    runtimeMinutes: 123,
    genres: ['Drama', 'Crime'],
  },
  the_godfather: {
    type: TitleType.MOVIE,
    name: 'The Godfather',
    year: 1972,
    director: 'Francis Ford Coppola',
    runtimeMinutes: 175,
    genres: ['Drama', 'Crime'],
  },
  the_dark_knight: {
    type: TitleType.MOVIE,
    name: 'The Dark Knight',
    year: 2008,
    director: 'Christopher Nolan',
    runtimeMinutes: 152,
    genres: ['Action', 'Crime', 'Drama'],
  },
  forrest_gump: {
    type: TitleType.MOVIE,
    name: 'Forrest Gump',
    year: 1994,
    director: 'Robert Zemeckis',
    runtimeMinutes: 142,
    genres: ['Drama', 'Romance'],
  },
  fight_club: {
    type: TitleType.MOVIE,
    name: 'Fight Club',
    year: 1999,
    director: 'David Fincher',
    runtimeMinutes: 139,
    genres: ['Drama', 'Thriller'],
  },
  breaking_bad: {
    type: TitleType.SERIES,
    name: 'Breaking Bad',
    year: 2008,
    runtimeMinutes: 47,
    genres: ['Drama', 'Crime', 'Thriller'],
  },
} as const;

type TitleKey = keyof typeof titlesSeed;

const usersSeed: {
  email: string;
  name: string;
  password: string;
  role?: Role;
  watched: TitleKey[];
}[] = [
  {
    email: 'admin@email.com',
    name: 'Admin',
    password: 'admin123',
    role: Role.ADMIN,
    watched: [],
  },
  {
    email: 'joao@email.com',
    name: 'Joao',
    password: '123456',
    watched: ['twenty_one', 'fight_club'],
  },
  {
    email: 'maria@email.com',
    name: 'Maria',
    password: '123456',
    watched: ['the_godfather', 'forrest_gump'],
  },
];

async function upsertTitle(seed: (typeof titlesSeed)[TitleKey]) {
  const { genres, ...data } = seed;

  const title = await prisma.title.upsert({
    where: {
      type_name_year: { type: data.type, name: data.name, year: data.year },
    },
    update: {},
    create: data,
  });

  for (const name of genres) {
    const genre = await prisma.genre.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    });
    await prisma.titleGenre.upsert({
      where: { titleId_genreId: { titleId: title.id, genreId: genre.id } },
      update: {},
      create: { titleId: title.id, genreId: genre.id },
    });
  }

  return title;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development seed: do not run it in production.');
  }

  const titleIds = {} as Record<TitleKey, number>;
  for (const key of Object.keys(titlesSeed) as TitleKey[]) {
    titleIds[key] = (await upsertTitle(titlesSeed[key])).id;
  }

  for (const u of usersSeed) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const role = u.role ?? Role.USER;

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, role },
      create: { email: u.email, name: u.name, passwordHash, role },
    });

    for (const key of u.watched) {
      await prisma.watchedTitle.upsert({
        where: {
          userId_titleId: { userId: user.id, titleId: titleIds[key] },
        },
        update: {},
        create: { userId: user.id, titleId: titleIds[key] },
      });
    }
  }

  const seasonsSeed = [
    { number: 1, episodes: ['Pilot', "Cat's in the Bag...", 'Gray Matter'] },
    { number: 2, episodes: ['Seven Thirty-Seven', 'Grilled'] },
  ];
  for (const { number, episodes } of seasonsSeed) {
    const titleId = titleIds.breaking_bad;
    const season = await prisma.season.upsert({
      where: { titleId_number: { titleId, number } },
      update: {},
      create: { titleId, number, name: `Season ${number}` },
    });
    for (const [i, name] of episodes.entries()) {
      await prisma.episode.upsert({
        where: { seasonId_number: { seasonId: season.id, number: i + 1 } },
        update: {},
        create: {
          seasonId: season.id,
          number: i + 1,
          name,
          runtimeMinutes: 47,
        },
      });
    }
  }

  console.log('Seed done');
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
