import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@course-dashboard/db";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const title = String(formData.get("title") ?? "").trim();
  const dueAtRaw = String(formData.get("dueAt") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !dueAtRaw) {
    return NextResponse.redirect(new URL("/?formError=Title and due date are required", req.url));
  }

  const dueAt = new Date(dueAtRaw);
  if (Number.isNaN(dueAt.getTime())) {
    return NextResponse.redirect(new URL("/?formError=Invalid date", req.url));
  }

  await prisma.deadline.create({
    data: {
      title,
      description: description || null,
      dueAt,
      source: "MANUAL",
      externalId: crypto.randomUUID(),
    },
  });

  return NextResponse.redirect(new URL("/?added=deadline", req.url));
}
