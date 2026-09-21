-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'T10M';
ALTER TYPE "NotificationKind" ADD VALUE 'T0';
ALTER TYPE "NotificationKind" ADD VALUE 'NAG';

-- AlterTable
ALTER TABLE "Deadline" ADD COLUMN     "nagAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "urgent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "nagAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "urgent" BOOLEAN NOT NULL DEFAULT false;
