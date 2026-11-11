-- TMDB ids are only unique within a media type (a movie and a series can share one)
DROP INDEX "titles_tmdb_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "titles_type_tmdb_id_key" ON "titles"("type", "tmdb_id");

-- CreateTable
CREATE TABLE "cast_members" (
    "id" SERIAL NOT NULL,
    "title_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "character" TEXT,
    "position" INTEGER NOT NULL,
    "profile_url" TEXT,

    CONSTRAINT "cast_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cast_members_title_id_position_idx" ON "cast_members"("title_id", "position");

-- AddForeignKey
ALTER TABLE "cast_members" ADD CONSTRAINT "cast_members_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
