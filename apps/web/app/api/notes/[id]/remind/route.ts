import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { USER_UTC_OFFSET } from "@course-dashboard/shared";
import { redirectAfterAction } from "@/lib/redirect";

function parseLocalDateTime(raw: string): Date | null {
  const date = new Date(`${raw}${USER_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Turns a note into a one-off Deadline so it rides the exact same T-24h/T-2h
// Telegram reminder machinery deadlines already use, rather than building a
// second, parallel notification system just for notes.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await req.formData();
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const dueTimeRaw = String(formData.get("dueTime") ?? "");

  if (!dueDateRaw || !dueTimeRaw) {
    return redirectAfterAction(new URL("/notes?formError=Pick a date and time for the reminder", req.url));
  }

  const dueAt = parseLocalDateTime(`${dueDateRaw}T${dueTimeRaw}`);
  if (!dueAt) {
    return redirectAfterAction(new URL("/notes?formError=Invalid date", req.url));
  }

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) {
    return redirectAfterAction(new URL("/notes?formError=Note not found", req.url));
  }

  const title = note.content.length > 60 ? `${note.content.slice(0, 60)}…` : note.content;

  try {
    await prisma.deadline.create({
      data: {
        title: `[${note.category}] ${title}`,
        description: note.content,
        dueAt,
        source: "MANUAL",
        externalId: crypto.randomUUID(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/notes/:id/remind] failed:", err);
    return redirectAfterAction(
      new URL(`/notes?formError=${encodeURIComponent(`Failed to set reminder: ${message}`)}`, req.url)
    );
  }

  return redirectAfterAction(new URL("/notes?reminded=1", req.url));
}
