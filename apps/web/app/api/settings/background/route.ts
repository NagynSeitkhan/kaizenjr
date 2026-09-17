import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const urlInput = String(formData.get("url") ?? "").trim();
  const image = formData.get("image");

  try {
    let value: string | null = null;

    if (image instanceof File && image.size > 0) {
      const blob = await put(`backgrounds/${crypto.randomUUID()}-${image.name}`, image, {
        access: "public",
      });
      value = blob.url;
    } else if (urlInput) {
      if (!/^https?:\/\//.test(urlInput)) {
        return redirectAfterAction(
          new URL("/?formError=Background URL must start with http:// or https://", req.url)
        );
      }
      value = urlInput;
    }

    if (!value) {
      return redirectAfterAction(new URL("/?formError=Provide a background image URL or file", req.url));
    }

    await prisma.setting.upsert({
      where: { key: "backgroundUrl" },
      create: { key: "backgroundUrl", value },
      update: { value },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/settings/background] failed:", err);
    return redirectAfterAction(
      new URL(`/?formError=${encodeURIComponent(`Failed to set background: ${message}`)}`, req.url)
    );
  }

  return redirectAfterAction(new URL("/?added=background", req.url));
}
