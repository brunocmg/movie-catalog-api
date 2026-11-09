-- Movie becomes Title (MOVIE | SERIES), genres get their own table, and
-- watched_movies becomes watched_titles. Written by hand to keep the data:
-- tables and columns are renamed in place, existing rows become MOVIE.

DROP VIEW IF EXISTS "user_watched_movies";

-- titles --------------------------------------------------------------------
CREATE TYPE "title_type" AS ENUM ('MOVIE', 'SERIES');

ALTER TABLE "movies" RENAME TO "titles";
ALTER SEQUENCE "movies_id_seq" RENAME TO "titles_id_seq";
ALTER TABLE "titles" RENAME CONSTRAINT "movies_pkey" TO "titles_pkey";
ALTER INDEX "movies_year_idx" RENAME TO "titles_year_idx";
DROP INDEX "movies_name_year_key";

ALTER TABLE "titles" ADD COLUMN "type" "title_type" NOT NULL DEFAULT 'MOVIE';
ALTER TABLE "titles" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "titles" ADD COLUMN "synopsis" TEXT;
ALTER TABLE "titles" ADD COLUMN "poster_url" TEXT;
ALTER TABLE "titles" ADD COLUMN "runtime_minutes" INTEGER;
ALTER TABLE "titles" ADD COLUMN "tmdb_id" INTEGER;

CREATE UNIQUE INDEX "titles_tmdb_id_key" ON "titles"("tmdb_id");
CREATE UNIQUE INDEX "titles_type_name_year_key" ON "titles"("type", "name", "year");

-- genres --------------------------------------------------------------------
CREATE TABLE "genres" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

CREATE TABLE "title_genres" (
    "title_id" INTEGER NOT NULL,
    "genre_id" INTEGER NOT NULL,

    CONSTRAINT "title_genres_pkey" PRIMARY KEY ("title_id", "genre_id")
);
CREATE INDEX "title_genres_genre_id_idx" ON "title_genres"("genre_id");
ALTER TABLE "title_genres" ADD CONSTRAINT "title_genres_title_id_fkey"
    FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "title_genres" ADD CONSTRAINT "title_genres_genre_id_fkey"
    FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- the old free-text "genre" column may hold several names ("Drama, Crime")
CREATE TEMP TABLE "_title_genre_names" AS
SELECT t."id" AS "title_id", trim(g.name) AS "name"
FROM "titles" t
CROSS JOIN LATERAL regexp_split_to_table(t."genre", ',') AS g(name)
WHERE t."genre" IS NOT NULL AND trim(g.name) <> '';

-- same slug rule as the API: lower case, accents stripped, a-z0-9 joined by "-"
CREATE TEMP TABLE "_genre_slugs" AS
SELECT DISTINCT ON (slug) slug, "name"
FROM (
  SELECT
    trim(both '-' from regexp_replace(
      translate(lower("name"), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
      '[^a-z0-9]+', '-', 'g')) AS slug,
    "name"
  FROM "_title_genre_names"
) s
WHERE slug <> ''
ORDER BY slug, "name" COLLATE "C";

INSERT INTO "genres" ("name", "slug") SELECT "name", slug FROM "_genre_slugs";

INSERT INTO "title_genres" ("title_id", "genre_id")
SELECT DISTINCT n."title_id", g."id"
FROM "_title_genre_names" n
JOIN "genres" g ON g."slug" = trim(both '-' from regexp_replace(
      translate(lower(n."name"), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
      '[^a-z0-9]+', '-', 'g'));

ALTER TABLE "titles" DROP COLUMN "genre";

-- watched_movies -> watched_titles --------------------------------------------
ALTER TABLE "watched_movies" RENAME TO "watched_titles";
ALTER TABLE "watched_titles" RENAME COLUMN "movie_id" TO "title_id";
ALTER TABLE "watched_titles" RENAME CONSTRAINT "watched_movies_pkey" TO "watched_titles_pkey";
ALTER TABLE "watched_titles" RENAME CONSTRAINT "watched_movies_user_id_fkey" TO "watched_titles_user_id_fkey";
ALTER TABLE "watched_titles" RENAME CONSTRAINT "watched_movies_movie_id_fkey" TO "watched_titles_title_id_fkey";
ALTER INDEX "watched_movies_movie_id_idx" RENAME TO "watched_titles_title_id_idx";

CREATE VIEW "user_watched_titles" AS
SELECT
  u.id AS user_id,
  u.name AS user_name,
  u.email AS user_email,
  t.id AS title_id,
  t.type AS title_type,
  t.name AS title_name,
  t.year AS title_year,
  wt.watched_at
FROM "watched_titles" wt
JOIN "users" u ON u.id = wt.user_id
JOIN "titles" t ON t.id = wt.title_id;
