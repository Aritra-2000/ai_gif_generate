/*
  Warnings:

  - Added the required column `endTime` to the `Gif` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `Gif` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Gif" ADD COLUMN     "endTime" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "startTime" DOUBLE PRECISION NOT NULL;
