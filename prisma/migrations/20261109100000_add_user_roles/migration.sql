-- Roles for authorization. Existing users become USER; promote an admin with:
--   UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';

-- CreateEnum
CREATE TYPE "role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "role" NOT NULL DEFAULT 'USER';

