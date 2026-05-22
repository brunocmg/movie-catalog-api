-- Rename Prisma's implicit many-to-many table to a portfolio-friendly table.
ALTER TABLE "_MovieToUser" RENAME TO "watched_movies";

ALTER TABLE "watched_movies" RENAME COLUMN "A" TO "movie_id";
ALTER TABLE "watched_movies" RENAME COLUMN "B" TO "user_id";

ALTER TABLE "watched_movies" ADD COLUMN "watched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "watched_movies" RENAME CONSTRAINT "_MovieToUser_AB_pkey" TO "watched_movies_pkey";
ALTER INDEX "_MovieToUser_B_index" RENAME TO "watched_movies_user_id_idx";
ALTER TABLE "watched_movies" RENAME CONSTRAINT "_MovieToUser_A_fkey" TO "watched_movies_movie_id_fkey";
ALTER TABLE "watched_movies" RENAME CONSTRAINT "_MovieToUser_B_fkey" TO "watched_movies_user_id_fkey";

CREATE VIEW "user_watched_movies" AS
SELECT
  u.id AS user_id,
  u.name AS user_name,
  u.email AS user_email,
  m.id AS movie_id,
  m.name AS movie_name,
  m.year AS movie_year,
  wm.watched_at
FROM "watched_movies" wm
JOIN "users" u ON u.id = wm.user_id
JOIN "movies" m ON m.id = wm.movie_id;
