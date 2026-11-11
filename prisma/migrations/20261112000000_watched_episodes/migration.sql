-- CreateTable
CREATE TABLE "watched_episodes" (
    "user_id" INTEGER NOT NULL,
    "episode_id" INTEGER NOT NULL,
    "watched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watched_episodes_pkey" PRIMARY KEY ("user_id","episode_id")
);

-- CreateIndex
CREATE INDEX "watched_episodes_episode_id_idx" ON "watched_episodes"("episode_id");

-- AddForeignKey
ALTER TABLE "watched_episodes" ADD CONSTRAINT "watched_episodes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watched_episodes" ADD CONSTRAINT "watched_episodes_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
