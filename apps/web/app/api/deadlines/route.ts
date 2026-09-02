import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@course-dashboard/db";
import { USER_UTC_OFFSET } from "@course-dashboard/shared";

// The <input type="datetime-local"> value has no timezone info - it's the
// browser's local wall-clock time. Vercel's serverless functions run with
// TZ=UTC, so `new Date(rawValue)` would silently reinterpret that wall-clock
// string as UTC instead of the user's real timezone, so we pin the offset
// explicitly (see packages/shared/src/time.ts for the display-side match).
function parseLocalDateTime(raw: string): Date | null {
  const date = new Date(`${raw}${USER_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const title = String(formData.get("title") ?? "").trim();
  const dueAtRaw = String(formData.get("dueAt") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !dueAtRaw) {
    return NextResponse.redirect(new URL("/?formError=Title and due date are required", req.url));
  }

  const dueAt = parseLocalDateTime(dueAtRaw);
  if (!dueAt) {
    return NextResponse.redirect(new URL("/?formError=Invalid date", req.url));
  }

  try {
    await prisma.deadline.create({
      data: {
        title,
        description: description || null,
        dueAt,
        source: "MANUAL",
        externalId: crypto.randomUUID(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/deadlines] create failed:", err);
    return NextResponse.redirect(
      new URL(`/?formError=${encodeURIComponent(`Failed to save: ${message}`)}`, req.url)
    );
  }

  return NextResponse.redirect(new URL("/?added=deadline", req.url));
}
