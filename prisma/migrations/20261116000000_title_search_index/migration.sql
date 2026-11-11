CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Serves ILIKE '%term%' searches on the title name
CREATE INDEX "titles_name_trgm_idx" ON "titles" USING GIN ("name" gin_trgm_ops);
