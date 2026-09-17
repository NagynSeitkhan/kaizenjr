import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@course-dashboard/db";
import { parseUserLocalDateTime } from "@course-dashboard/shared";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const title = String(formData.get("title") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const dueTimeRaw = String(formData.get("dueTime") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const image = formData.get("image");

  if (!title || !dueDateRaw || !dueTimeRaw) {
    return redirectAfterAction(new URL("/?formError=Title and due date are required", req.url));
  }

  const dueAt = parseUserLocalDateTime(`${dueDateRaw}T${dueTimeRaw}`);
  if (!dueAt) {
    return redirectAfterAction(new URL("/?formError=Invalid date", req.url));
  }

  try {
    let imageUrl: string | null = null;
    if (image instanceof File && image.size > 0) {
      const blob = await put(`deadlines/${crypto.randomUUID()}-${image.name}`, image, {
        access: "public",
      });
      imageUrl = blob.url;
    }

    await prisma.deadline.create({
      data: {
        title,
        description: description || null,
        dueAt,
        source: "MANUAL",
        externalId: crypto.randomUUID(),
        imageUrl,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/deadlines] create failed:", err);
    return redirectAfterAction(
      new URL(`/?formError=${encodeURIComponent(`Failed to save: ${message}`)}`, req.url)
    );
  }

  return redirectAfterAction(new URL("/?added=deadline", req.url));
}
