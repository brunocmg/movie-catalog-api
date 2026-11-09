-- Schema cleanup: snake_case columns, audit timestamps, lower-cased e-mails,
-- unique (name, year) for movies and consistent keys/indexes for watched_movies.
-- Hand-written so existing data is preserved (renames instead of drop/add).

-- ---------------------------------------------------------------------------
-- Guards: abort with a clear message instead of a raw unique violation
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT lower(trim(email)) FROM "users"
    GROUP BY lower(trim(email)) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'schema_cleanup: users with e-mails that differ only by case/whitespace exist; merge them before migrating';
  END IF;

  IF EXISTS (
    SELECT name, year FROM "movies"
    GROUP BY name, year HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'schema_cleanup: duplicated movies (same name and year) exist; merge them before migrating';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
ALTER TABLE "users" RENAME COLUMN "passwordHash" TO "password_hash";

ALTER TABLE "users" RENAME COLUMN "createAt" TO "created_at";
UPDATE "users" SET "created_at" = CURRENT_TIMESTAMP WHERE "created_at" IS NULL;
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;

-- @updatedAt is managed by Prisma: backfill existing rows, then drop the default
ALTER TABLE "users" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;

UPDATE "users" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));

-- ---------------------------------------------------------------------------
-- movies
-- ---------------------------------------------------------------------------
ALTER TABLE "movies" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "movies" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "movies" ALTER COLUMN "updated_at" DROP DEFAULT;

CREATE UNIQUE INDEX "movies_name_year_key" ON "movies"("name", "year");
CREATE INDEX "movies_year_idx" ON "movies"("year");

-- ---------------------------------------------------------------------------
-- watched_movies: primary key in (user_id, movie_id) order, as declared in the
-- Prisma schema, which already serves lookups by user. Index by movie instead.
-- ---------------------------------------------------------------------------
ALTER TABLE "watched_movies" DROP CONSTRAINT "watched_movies_pkey",
ADD CONSTRAINT "watched_movies_pkey" PRIMARY KEY ("user_id", "movie_id");

DROP INDEX "watched_movies_user_id_idx";
CREATE INDEX "watched_movies_movie_id_idx" ON "watched_movies"("movie_id");
