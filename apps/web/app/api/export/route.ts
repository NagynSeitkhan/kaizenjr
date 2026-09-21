import { NextResponse } from "next/server";
import { prisma } from "@course-dashboard/db";

// Protected by middleware like every other non-public route (session cookie
// required). Deliberately excludes IntegrationCredential (encrypted OAuth/
// session tokens) and NotificationLog (internal dedup bookkeeping, not user
// data) - this is a backup of your actual content, not the app's internals.
// Includes soft-deleted (trashed) rows too, since a backup that can't
// recover something you deleted by mistake isn't much of a safety net.
export async function GET() {
  const [courses, deadlines, tasks, notes] = await Promise.all([
    prisma.course.findMany(),
    prisma.deadline.findMany({ include: { course: true } }),
    prisma.task.findMany({ include: { status: true } }),
    prisma.note.findMany(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    courses,
    deadlines,
    tasks,
    notes,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="course-dashboard-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
