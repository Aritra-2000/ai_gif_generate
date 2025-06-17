/*
  Warnings:

  - You are about to drop the column `caption` on the `Gif` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Gif` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `Gif` table. All the data in the column will be lost.
  - You are about to drop the column `error` on the `Gif` table. All the data in the column will be lost.
  - You are about to drop the column `prompt` on the `Gif` table. All the data in the column will be lost.
  - You are about to drop the column `retried` on the `Gif` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Gif` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Gif` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Gif` table. All the data in the column will be lost.
  - You are about to drop the column `transcript` on the `Video` table. All the data in the column will be lost.
  - Added the required column `duration` to the `Gif` table without a default value. This is not possible if the table is not empty.
  - Made the column `url` on table `Gif` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `videoId` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Gif_status_idx";

-- DropIndex
DROP INDEX "Gif_userId_idx";

-- DropIndex
DROP INDEX "Gif_videoId_idx";

-- AlterTable
ALTER TABLE "Gif" DROP COLUMN "caption",
DROP COLUMN "description",
DROP COLUMN "endTime",
DROP COLUMN "error",
DROP COLUMN "prompt",
DROP COLUMN "retried",
DROP COLUMN "startTime",
DROP COLUMN "status",
DROP COLUMN "title",
ADD COLUMN     "duration" INTEGER NOT NULL,
ALTER COLUMN "url" SET NOT NULL;

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "transcript",
ADD COLUMN     "thumbnail" TEXT,
ADD COLUMN     "videoId" TEXT NOT NULL;
