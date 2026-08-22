import { google } from "googleapis";
import { prisma } from "@course-dashboard/db";
import { getAuthorizedGoogleClient, markGoogleSyncResult } from "@course-dashboard/shared";

// Strips trailing room/session noise so recurring lecture/lab/section events
// of the same course collapse into one Course row, e.g.
// "CSCI 152 - Lecture (SSH 208)" -> "CSCI 152".
function normalizeCourseName(summary: string): string {
  return summary
    .replace(/\(.*?\)/g, "")
    .replace(/[-–—:].*$/, "")
    .trim();
}

export async function syncCalendar(): Promise<void> {
  try {
    const auth = await getAuthorizedGoogleClient();
    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days out

    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: horizon.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const events = res.data.items ?? [];
    let courseCount = 0;
    let deadlineCount = 0;

    for (const event of events) {
      if (!event.id || !event.summary) continue;
      const start = event.start?.dateTime ?? event.start?.date;
      if (!start) continue;

      if (event.recurringEventId) {
        // A recurring class session -> only used to keep the Course list current,
        // not stored as its own Deadline (a weekly lecture isn't a deadline).
        await prisma.course.upsert({
          where: {
            source_externalId: { source: "GOOGLE_CALENDAR", externalId: event.recurringEventId },
          },
          create: {
            name: normalizeCourseName(event.summary),
            source: "GOOGLE_CALENDAR",
            externalId: event.recurringEventId,
          },
          update: { name: normalizeCourseName(event.summary) },
        });
        courseCount++;
        continue;
      }

      // A one-off event (assignment due date, exam, meeting, etc.) - store as a Deadline
      // so it shows up on the dashboard and is eligible for T-24h/T-2h reminders later.
      await prisma.deadline.upsert({
        where: { source_externalId: { source: "GOOGLE_CALENDAR", externalId: event.id } },
        create: {
          title: event.summary,
          description: event.description ?? null,
          dueAt: new Date(start),
          source: "GOOGLE_CALENDAR",
          externalId: event.id,
          url: event.htmlLink ?? null,
        },
        update: {
          title: event.summary,
          description: event.description ?? null,
          dueAt: new Date(start),
          url: event.htmlLink ?? null,
        },
      });
      deadlineCount++;
    }

    await markGoogleSyncResult();
    console.log(
      `[syncCalendar] processed ${events.length} events (${courseCount} course sessions, ${deadlineCount} one-off deadlines)`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markGoogleSyncResult(message).catch(() => undefined);
    console.error("[syncCalendar] failed:", message);
  }
}
