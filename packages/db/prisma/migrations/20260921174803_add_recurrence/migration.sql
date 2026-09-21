-- CreateEnum
CREATE TYPE "Recurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Deadline" ADD COLUMN     "recurrence" "Recurrence" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "recurrence" "Recurrence" NOT NULL DEFAULT 'NONE';
