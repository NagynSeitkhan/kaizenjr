-- AlterTable
ALTER TABLE "Deadline" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "notifyEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;
