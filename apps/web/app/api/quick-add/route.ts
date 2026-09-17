import { NextRequest } from "next/server";
import { processQuickCapture } from "@course-dashboard/shared";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const text = String(formData.get("text") ?? "").trim();

  if (!text) {
    return redirectAfterAction(new URL("/", req.url));
  }

  try {
    const result = await processQuickCapture(text, {
      sourceType: "MANUAL",
      sourceRef: crypto.randomUUID(),
    });
    return redirectAfterAction(
      new URL(`/?quickAdded=${encodeURIComponent(result.summary)}`, req.url)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/quick-add] failed:", err);
    return redirectAfterAction(
      new URL(`/?formError=${encodeURIComponent(`Quick add failed: ${message}`)}`, req.url)
    );
  }
}
