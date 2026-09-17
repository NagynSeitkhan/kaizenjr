import { NextRequest } from "next/server";
import { prisma } from "@course-dashboard/db";
import { redirectAfterAction } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  await prisma.setting.deleteMany({ where: { key: "backgroundUrl" } });
  return redirectAfterAction(new URL("/", req.url));
}
