/**
 * Imports a curated list of movies and series into a running API through its
 * admin endpoints (GET /tmdb/search + POST /tmdb/import). It touches no users
 * and needs no database access, so it is safe to point at production.
 *
 *   API_URL=https://movie-catalog-api-54m7.onrender.com \
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *   npx tsx scripts/import-catalog.ts
 *
 * Re-running is safe: existing titles are refreshed, not duplicated.
 */

type Kind = 'MOVIE' | 'SERIES';
type Entry = [kind: Kind, name: string, year: number];

const CATALOG: Entry[] = [
  ['MOVIE', 'The Shawshank Redemption', 1994],
  ['MOVIE', 'The Godfather', 1972],
  ['MOVIE', 'The Godfather Part II', 1974],
  ['MOVIE', 'The Dark Knight', 2008],
  ['MOVIE', '12 Angry Men', 1957],
  ['MOVIE', "Schindler's List", 1993],
  ['MOVIE', 'Pulp Fiction', 1994],
  ['MOVIE', 'Forrest Gump', 1994],
  ['MOVIE', 'Fight Club', 1999],
  ['MOVIE', '21', 2008],
  ['MOVIE', 'The Lord of the Rings: The Fellowship of the Ring', 2001],
  ['MOVIE', 'The Lord of the Rings: The Two Towers', 2002],
  ['MOVIE', 'The Lord of the Rings: The Return of the King', 2003],
  ['MOVIE', 'Inception', 2010],
  ['MOVIE', 'Interstellar', 2014],
  ['MOVIE', 'The Matrix', 1999],
  ['MOVIE', 'Goodfellas', 1990],
  ['MOVIE', 'Se7en', 1995],
  ['MOVIE', 'The Silence of the Lambs', 1991],
  ['MOVIE', 'Star Wars', 1977],
  ['MOVIE', 'The Empire Strikes Back', 1980],
  ['MOVIE', 'Back to the Future', 1985],
  ['MOVIE', 'Gladiator', 2000],
  ['MOVIE', 'The Prestige', 2006],
  ['MOVIE', 'The Departed', 2006],
  ['MOVIE', 'Whiplash', 2014],
  ['MOVIE', 'Parasite', 2019],
  ['MOVIE', 'Spirited Away', 2001],
  ['MOVIE', 'Toy Story', 1995],
  ['MOVIE', 'The Lion King', 1994],
  ['MOVIE', 'Finding Nemo', 2003],
  ['MOVIE', 'Avengers: Endgame', 2019],
  ['MOVIE', 'Jurassic Park', 1993],
  ['MOVIE', 'Titanic', 1997],
  ['MOVIE', 'Avatar', 2009],
  ['MOVIE', 'Terminator 2: Judgment Day', 1991],
  ['MOVIE', 'Alien', 1979],
  ['MOVIE', 'Blade Runner', 1982],
  ['MOVIE', 'Psycho', 1960],
  ['MOVIE', 'The Shining', 1980],
  ['MOVIE', 'Django Unchained', 2012],
  ['MOVIE', 'Inglourious Basterds', 2009],
  ['MOVIE', 'Saving Private Ryan', 1998],
  ['MOVIE', 'The Green Mile', 1999],
  ['MOVIE', 'Joker', 2019],
  ['MOVIE', 'Mad Max: Fury Road', 2015],
  ['MOVIE', 'La La Land', 2016],
  ['MOVIE', 'City of God', 2002],
  ['MOVIE', 'Central Station', 1998],
  ['MOVIE', 'Elite Squad', 2007],
  ['SERIES', 'Breaking Bad', 2008],
  ['SERIES', 'Game of Thrones', 2011],
  ['SERIES', 'Stranger Things', 2016],
  ['SERIES', 'The Wire', 2002],
  ['SERIES', 'Better Call Saul', 2015],
  ['SERIES', 'Chernobyl', 2019],
  ['SERIES', 'Black Mirror', 2011],
  ['SERIES', 'Friends', 1994],
  ['SERIES', 'The Office', 2005],
];

interface SearchResult {
  tmdbId: number;
  name: string;
  year: number | null;
}

const API_URL = (process.env.API_URL ?? '').replace(/\/+$/, '');
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

async function call<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
  retries = 3,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(API_URL + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) return (await res.json()) as T;
    // free-tier hosts cold start and throttle: back off and retry
    if ([429, 502, 503, 504].includes(res.status) && attempt <= retries) {
      await sleep(3000 * attempt);
      continue;
    }
    throw new Error(`${res.status} ${await res.text()}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function pick(results: SearchResult[], name: string, year: number) {
  const wanted = normalize(name);
  const sameYear = results.filter((r) => r.year === year);
  return (
    sameYear.find((r) => normalize(r.name) === wanted) ??
    sameYear[0] ??
    results.find(
      (r) =>
        normalize(r.name) === wanted &&
        r.year !== null &&
        Math.abs(r.year - year) <= 1,
    )
  );
}

async function main() {
  if (!API_URL || !EMAIL || !PASSWORD) {
    throw new Error('Set API_URL, ADMIN_EMAIL and ADMIN_PASSWORD.');
  }

  console.log(`Logging in at ${API_URL} ...`);
  const { accessToken } = await call<{ accessToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  let ok = 0;
  const failed: string[] = [];

  for (const [type, name, year] of CATALOG) {
    const label = `${name} (${year})`;
    try {
      const results = await call<SearchResult[]>(
        `/tmdb/search?type=${type}&q=${encodeURIComponent(name)}`,
        {},
        accessToken,
      );
      const match = pick(results, name, year);
      if (!match) throw new Error('no TMDB match');

      await call(
        '/tmdb/import',
        {
          method: 'POST',
          body: JSON.stringify({ type, tmdbId: match.tmdbId }),
        },
        accessToken,
      );
      ok++;
      console.log(`OK    ${label}`);
    } catch (e) {
      failed.push(label);
      console.log(`FAIL  ${label}: ${(e as Error).message}`);
    }
    await sleep(400);
  }

  console.log(`\nImported ${ok}/${CATALOG.length}.`);
  if (failed.length) console.log(`Failed:\n - ${failed.join('\n - ')}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
