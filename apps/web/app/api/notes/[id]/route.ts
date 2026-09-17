import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await req.formData();
  const category = String(formData.get("category") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!category || !content) {
    return redirectAfterAction(new URL("/notes?formError=Category and note are required", req.url));
  }

  try {
    await prisma.note.update({ where: { id }, data: { category, content } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/notes/:id] update failed:", err);
    return redirectAfterAction(
      new URL(`/notes?formError=${encodeURIComponent(`Failed to update: ${message}`)}`, req.url)
    );
  }

  return redirectAfterAction(
    new URL(`/notes?category=${encodeURIComponent(category)}&updated=1`, req.url)
  );
}
