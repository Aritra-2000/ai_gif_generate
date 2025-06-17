/*
  Warnings:

  - The `status` column on the `Gif` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "GifStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- AlterTable
ALTER TABLE "Gif" DROP COLUMN "status",
ADD COLUMN     "status" "GifStatus" NOT NULL DEFAULT 'pending';
