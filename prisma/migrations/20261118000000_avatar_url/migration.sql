-- Avatars used to be a bare file name; they are now a URL or a path served by the API
UPDATE "users" SET "avatar" = '/files/avatars/' || "avatar"
WHERE "avatar" IS NOT NULL AND "avatar" !~ '^(https?://|/)';
