-- AlterTable
ALTER TABLE "Gif" ADD COLUMN     "caption" TEXT,
ADD COLUMN     "error" TEXT;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "transcript" JSONB;
