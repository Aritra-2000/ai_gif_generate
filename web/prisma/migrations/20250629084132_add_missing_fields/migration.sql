/*
  Warnings:

  - Added the required column `fileSize` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filename` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalName` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "fileSize" INTEGER NOT NULL,
ADD COLUMN     "filename" TEXT NOT NULL,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "originalName" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'processing';
