/*
  Warnings:

  - Added the required column `title` to the `Gif` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Gif" ADD COLUMN     "description" TEXT,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "description" TEXT;
