import { google } from "googleapis";
import { prisma } from "@course-dashboard/db";
import { getAuthorizedGoogleClient } from "@course-dashboard/shared";

const STATUS_MAP: Record<string, "PENDING" | "IN_PROGRESS" | "DONE"> = {
  pending: "PENDING",
  "in progress": "IN_PROGRESS",
  done: "DONE",
};

// Expected header row in the "Tasks" tab:
// A: Title | B: Source | C: MentionedAt | D: Context | E: Status | F: RowId
export async function syncTasksSheet(): Promise<void> {
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.warn("[syncTasksSheet] SHEETS_SPREADSHEET_ID not set, skipping");
    return;
  }

  try {
    const auth = await getAuthorizedGoogleClient();
    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Tasks!A2:F",
    });

    const rows = res.data.values ?? [];
    let synced = 0;

    for (const row of rows) {
      const [title, source, mentionedAt, context, status, rowId] = row;
      if (!title || !rowId) continue;

      const task = await prisma.task.upsert({
        where: { sourceType_sourceRef: { sourceType: "SHEET", sourceRef: String(rowId) } },
        create: {
          title: String(title),
          sourceType: "SHEET",
          sourceRef: String(rowId),
          mentionedAt: mentionedAt ? new Date(mentionedAt) : null,
          context: context ? String(context) : null,
        },
        update: {
          title: String(title),
          mentionedAt: mentionedAt ? new Date(mentionedAt) : null,
          context: context ? String(context) : null,
        },
      });

      const state = STATUS_MAP[String(status ?? "").toLowerCase().trim()] ?? "UNKNOWN";
      await prisma.taskStatus.upsert({
        where: { taskId: task.id },
        create: { taskId: task.id, state, source: "tasks_sheet" },
        update: { state, source: "tasks_sheet" },
      });

      synced++;
    }

    console.log(`[syncTasksSheet] synced ${synced} rows`);
  } catch (err) {
    console.error("[syncTasksSheet] failed:", err instanceof Error ? err.message : err);
  }
}
