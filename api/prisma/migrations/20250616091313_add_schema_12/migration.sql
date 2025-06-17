/*
  Warnings:

  - You are about to drop the column `videoId` on the `Video` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Gif" ADD COLUMN     "prompt" TEXT,
ADD COLUMN     "retried" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "videoId";
