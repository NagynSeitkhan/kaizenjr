import { NextRequest } from "next/server";
import { completeTaskAndAdvance } from "@course-dashboard/shared";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await completeTaskAndAdvance(id);
  return redirectAfterAction(new URL("/?done=1", req.url));
}
