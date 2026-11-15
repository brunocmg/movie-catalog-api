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

type ExtraTitle = {
  type: TitleType;
  name: string;
  year: number;
  director?: string;
  runtimeMinutes: number;
  genres: string[];
};

const movie = (
  name: string,
  year: number,
  director: string,
  runtimeMinutes: number,
  genres: string[],
): ExtraTitle => ({
  type: TitleType.MOVIE,
  name,
  year,
  director,
  runtimeMinutes,
  genres,
});

const series = (
  name: string,
  year: number,
  runtimeMinutes: number,
  genres: string[],
): ExtraTitle => ({
  type: TitleType.SERIES,
  name,
  year,
  runtimeMinutes,
  genres,
});

const extraTitlesSeed: ExtraTitle[] = [
  movie('The Shawshank Redemption', 1994, 'Frank Darabont', 142, ['Drama']),
  movie('The Godfather Part II', 1974, 'Francis Ford Coppola', 202, ['Drama', 'Crime']),
  movie('12 Angry Men', 1957, 'Sidney Lumet', 96, ['Drama', 'Crime']),
  movie("Schindler's List", 1993, 'Steven Spielberg', 195, ['Drama', 'History']),
  movie('Pulp Fiction', 1994, 'Quentin Tarantino', 154, ['Crime', 'Drama']),
  movie('The Lord of the Rings: The Fellowship of the Ring', 2001, 'Peter Jackson', 178, ['Adventure', 'Fantasy']),
  movie('The Lord of the Rings: The Two Towers', 2002, 'Peter Jackson', 179, ['Adventure', 'Fantasy']),
  movie('The Lord of the Rings: The Return of the King', 2003, 'Peter Jackson', 201, ['Adventure', 'Fantasy']),
  movie('Inception', 2010, 'Christopher Nolan', 148, ['Action', 'Sci-Fi', 'Thriller']),
  movie('Interstellar', 2014, 'Christopher Nolan', 169, ['Adventure', 'Drama', 'Sci-Fi']),
  movie('The Matrix', 1999, 'Lana Wachowski', 136, ['Action', 'Sci-Fi']),
  movie('Goodfellas', 1990, 'Martin Scorsese', 145, ['Crime', 'Drama']),
  movie('Se7en', 1995, 'David Fincher', 127, ['Crime', 'Mystery', 'Thriller']),
  movie('The Silence of the Lambs', 1991, 'Jonathan Demme', 118, ['Crime', 'Thriller', 'Horror']),
  movie('Star Wars: A New Hope', 1977, 'George Lucas', 121, ['Action', 'Adventure', 'Sci-Fi']),
  movie('The Empire Strikes Back', 1980, 'Irvin Kershner', 124, ['Action', 'Adventure', 'Sci-Fi']),
  movie('Back to the Future', 1985, 'Robert Zemeckis', 116, ['Adventure', 'Comedy', 'Sci-Fi']),
  movie('Gladiator', 2000, 'Ridley Scott', 155, ['Action', 'Drama', 'Adventure']),
  movie('The Prestige', 2006, 'Christopher Nolan', 130, ['Drama', 'Mystery', 'Sci-Fi']),
  movie('The Departed', 2006, 'Martin Scorsese', 151, ['Crime', 'Drama', 'Thriller']),
  movie('Whiplash', 2014, 'Damien Chazelle', 106, ['Drama', 'Music']),
  movie('Parasite', 2019, 'Bong Joon-ho', 132, ['Drama', 'Thriller', 'Comedy']),
  movie('Spirited Away', 2001, 'Hayao Miyazaki', 125, ['Animation', 'Adventure', 'Fantasy']),
  movie('Toy Story', 1995, 'John Lasseter', 81, ['Animation', 'Adventure', 'Comedy']),
  movie('The Lion King', 1994, 'Roger Allers', 88, ['Animation', 'Adventure', 'Drama']),
  movie('Finding Nemo', 2003, 'Andrew Stanton', 100, ['Animation', 'Adventure', 'Comedy']),
  movie('Avengers: Endgame', 2019, 'Anthony Russo', 181, ['Action', 'Adventure', 'Sci-Fi']),
  movie('Jurassic Park', 1993, 'Steven Spielberg', 127, ['Adventure', 'Sci-Fi', 'Thriller']),
  movie('Titanic', 1997, 'James Cameron', 195, ['Drama', 'Romance']),
  movie('Avatar', 2009, 'James Cameron', 162, ['Action', 'Adventure', 'Sci-Fi']),
  movie('Terminator 2: Judgment Day', 1991, 'James Cameron', 137, ['Action', 'Sci-Fi']),
  movie('Alien', 1979, 'Ridley Scott', 117, ['Horror', 'Sci-Fi']),
  movie('Blade Runner', 1982, 'Ridley Scott', 117, ['Sci-Fi', 'Thriller']),
  movie('Psycho', 1960, 'Alfred Hitchcock', 109, ['Horror', 'Mystery', 'Thriller']),
  movie('The Shining', 1980, 'Stanley Kubrick', 146, ['Horror', 'Drama']),
  movie('Django Unchained', 2012, 'Quentin Tarantino', 165, ['Drama', 'Western']),
  movie('Inglourious Basterds', 2009, 'Quentin Tarantino', 153, ['Adventure', 'Drama', 'War']),
  movie('Saving Private Ryan', 1998, 'Steven Spielberg', 169, ['Drama', 'War']),
  movie('The Green Mile', 1999, 'Frank Darabont', 189, ['Crime', 'Drama', 'Fantasy']),
  movie('Joker', 2019, 'Todd Phillips', 122, ['Crime', 'Drama', 'Thriller']),
  movie('Mad Max: Fury Road', 2015, 'George Miller', 120, ['Action', 'Adventure', 'Sci-Fi']),
  movie('La La Land', 2016, 'Damien Chazelle', 128, ['Comedy', 'Drama', 'Music']),
  movie('City of God', 2002, 'Fernando Meirelles', 130, ['Crime', 'Drama']),
  movie('Central Station', 1998, 'Walter Salles', 110, ['Drama']),
  movie('Elite Squad', 2007, 'José Padilha', 115, ['Action', 'Crime', 'Drama']),
  series('Game of Thrones', 2011, 57, ['Action', 'Adventure', 'Drama']),
  series('Stranger Things', 2016, 51, ['Drama', 'Fantasy', 'Horror']),
  series('The Wire', 2002, 59, ['Crime', 'Drama', 'Thriller']),
  series('Better Call Saul', 2015, 46, ['Crime', 'Drama']),
  series('Chernobyl', 2019, 65, ['Drama', 'History', 'Thriller']),
  series('Black Mirror', 2011, 60, ['Drama', 'Sci-Fi', 'Thriller']),
  series('Friends', 1994, 22, ['Comedy', 'Romance']),
  series('The Office', 2005, 22, ['Comedy']),
];

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

async function upsertTitle(seed: (typeof titlesSeed)[TitleKey] | ExtraTitle) {
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

  for (const extra of extraTitlesSeed) {
    await upsertTitle(extra);
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

  const joao = await prisma.user.findUniqueOrThrow({
    where: { email: 'joao@email.com' },
  });
  const list = await prisma.list.upsert({
    where: { userId_name: { userId: joao.id, name: 'Classics' } },
    update: {},
    create: {
      userId: joao.id,
      name: 'Classics',
      description: 'Movies worth a rewatch',
      isPublic: true,
    },
  });
  for (const key of ['the_godfather', 'fight_club'] as const) {
    await prisma.listItem.upsert({
      where: {
        listId_titleId: { listId: list.id, titleId: titleIds[key] },
      },
      update: {},
      create: { listId: list.id, titleId: titleIds[key] },
    });
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
