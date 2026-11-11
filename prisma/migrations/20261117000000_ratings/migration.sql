-- AlterTable
ALTER TABLE "titles" ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rating_sum" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ratings" (
    "user_id" INTEGER NOT NULL,
    "title_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "review" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("user_id","title_id"),
    CONSTRAINT "ratings_score_check" CHECK ("score" BETWEEN 1 AND 10)
);

-- CreateIndex
CREATE INDEX "ratings_title_id_idx" ON "ratings"("title_id");

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keeps titles.rating_count / rating_sum in step with ratings, including cascade deletes
CREATE FUNCTION "sync_title_rating"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "titles" SET "rating_count" = "rating_count" + 1, "rating_sum" = "rating_sum" + NEW."score"
    WHERE "id" = NEW."title_id";
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE "titles" SET "rating_sum" = "rating_sum" + NEW."score" - OLD."score"
    WHERE "id" = NEW."title_id";
  ELSE
    UPDATE "titles" SET "rating_count" = "rating_count" - 1, "rating_sum" = "rating_sum" - OLD."score"
    WHERE "id" = OLD."title_id";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ratings_sync_title"
AFTER INSERT OR UPDATE OF "score" OR DELETE ON "ratings"
FOR EACH ROW EXECUTE FUNCTION "sync_title_rating"();
