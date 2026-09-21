import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

// Courses were originally meant to come from Google Calendar sync, so
// there's never been a manual way to create one - with 0 courses actually
// synced yet, that left Course.color (already in the schema) completely
// unreachable. This lets you create a course by hand so deadlines have
// something to group/color by right now, independent of ever connecting
// Calendar.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();

  if (!name) {
    return redirectAfterAction(new URL("/?formError=Course name is required", req.url));
  }

  await prisma.course.create({
    data: {
      name,
      code: code || null,
      color: color || null,
      source: "MANUAL",
      externalId: crypto.randomUUID(),
    },
  });

  return redirectAfterAction(new URL("/?added=course", req.url));
}
