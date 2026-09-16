import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@course-dashboard/db";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const category = String(formData.get("category") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!category || !content) {
    return NextResponse.redirect(new URL("/notes?formError=Category and note are required", req.url));
  }

  try {
    await prisma.note.create({ data: { category, content } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/notes] create failed:", err);
    return NextResponse.redirect(
      new URL(`/notes?formError=${encodeURIComponent(`Failed to save: ${message}`)}`, req.url)
    );
  }

  return NextResponse.redirect(
    new URL(`/notes?category=${encodeURIComponent(category)}&added=1`, req.url)
  );
}
