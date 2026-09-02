-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('GOOGLE_CALENDAR', 'MOODLE', 'MANUAL');

-- CreateEnum
CREATE TYPE "TaskSourceType" AS ENUM ('SLACK', 'SHEET', 'MANUAL');

-- CreateEnum
CREATE TYPE "StatusState" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('DIGEST', 'T24H', 'T2H', 'MANUAL');

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "source" "SourceType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "color" TEXT,
    "ignored" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "source" "SourceType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" "TaskSourceType" NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "mentionedAt" TIMESTAMP(3),
    "channel" TEXT,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskStatus" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "state" "StatusState" NOT NULL DEFAULT 'UNKNOWN',
    "scoreValue" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "TaskStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailFlag" (
    "id" TEXT NOT NULL,
    "gmailId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "summarized" TEXT,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "includedInDigest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmailFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "deadlineId" TEXT,
    "kind" "NotificationKind" NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "telegramMessageId" TEXT,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationCredential" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "expiresAt" TIMESTAMP(3),
    "sessionCookieEnc" TEXT,
    "sessionCreatedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMsg" TEXT,

    CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_source_externalId_key" ON "Course"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Deadline_source_externalId_key" ON "Deadline"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_sourceType_sourceRef_key" ON "Task"("sourceType", "sourceRef");

-- CreateIndex
CREATE UNIQUE INDEX "TaskStatus_taskId_key" ON "TaskStatus"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailFlag_gmailId_key" ON "EmailFlag"("gmailId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_dedupKey_key" ON "NotificationLog"("dedupKey");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCredential_provider_key" ON "IntegrationCredential"("provider");

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskStatus" ADD CONSTRAINT "TaskStatus_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_deadlineId_fkey" FOREIGN KEY ("deadlineId") REFERENCES "Deadline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
