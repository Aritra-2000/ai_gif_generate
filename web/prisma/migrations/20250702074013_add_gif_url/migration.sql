/*
  Warnings:

  - Added the required column `url` to the `Gif` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Gif" ADD COLUMN     "url" TEXT NOT NULL;
