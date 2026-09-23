import Link from "next/link";
import { prisma } from "@course-dashboard/db";
import { formatUserDateTime, USER_TIMEZONE } from "@course-dashboard/shared";
import { Banner, cardStyle, sectionHeading, pageTitleStyle } from "@/lib/ui";

export const dynamic = "force-dynamic";

interface HistoryItem {
  id: string;
  type: "deadline" | "task";
  title: string;
  context: string | null;
  courseName: string | null;
  courseColor: string | null;
  doneAt: Date;
}

// Buckets a date into its Monday-start week, in Astana local calendar terms
// - deliberately not timezone-precise beyond that, since this only drives a
// human-readable "Sep 15 – Sep 21" label, not any scheduling decision.
function weekBucket(date: Date): { key: string; label: string } {
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: USER_TIMEZONE }).format(date);
  const [y, m, d] = dateStr.split("-").map(Number);
  const asUtc = new Date(Date.UTC(y, m - 1, d));
  const daysSinceMonday = (asUtc.getUTCDay() + 6) % 7;
  const monday = new Date(asUtc);
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  const fmt = (dt: Date) => dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return { key: monday.toISOString().slice(0, 10), label: `${fmt(monday)} – ${fmt(sunday)}` };
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ restored?: string }>;
}) {
  const params = await searchParams;

  const [completedDeadlines, doneTasks] = await Promise.all([
    prisma.deadline.findMany({
      where: { deletedAt: null, completedAt: { not: null } },
      include: { course: true },
      orderBy: { completedAt: "desc" },
      take: 200,
    }),
    prisma.task.findMany({
      where: { deletedAt: null, status: { state: "DONE" } },
      include: { status: true },
      orderBy: { status: { updatedAt: "desc" } },
      take: 200,
    }),
  ]);

  const items: HistoryItem[] = [
    ...completedDeadlines.map((d) => ({
      id: d.id,
      type: "deadline" as const,
      title: d.title,
      context: null,
      courseName: d.course?.name ?? null,
      courseColor: d.course?.color ?? null,
      doneAt: d.completedAt as Date,
    })),
    ...doneTasks.map((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      context: t.context,
      courseName: null,
      courseColor: null,
      doneAt: t.status?.updatedAt as Date,
    })),
  ].sort((a, b) => b.doneAt.getTime() - a.doneAt.getTime());

  const thisWeekKey = weekBucket(new Date()).key;
  const lastWeekKey = weekBucket(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).key;

  const groups = new Map<string, { label: string; items: HistoryItem[] }>();
  for (const item of items) {
    const { key, label } = weekBucket(item.doneAt);
    const displayLabel = key === thisWeekKey ? "This week" : key === lastWeekKey ? "Last week" : label;
    if (!groups.has(key)) groups.set(key, { label: displayLabel, items: [] });
    groups.get(key)!.items.push(item);
  }
  const orderedGroups = [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={pageTitleStyle}>History</h1>
        <Link href="/" style={{ color: "#8b93a7", fontSize: 14 }}>
          ← Dashboard
        </Link>
      </header>

      <p style={{ margin: 0, fontSize: 13, color: "#8b93a7" }}>
        Completed deadlines and done tasks, grouped by the week they were finished.
      </p>

      {params.restored && <Banner tone="success">Reopened.</Banner>}

      {items.length === 0 ? (
        <p style={{ color: "#8b93a7" }}>Nothing marked done yet.</p>
      ) : (
        orderedGroups.map(([key, group]) => (
          <section key={key}>
            <h2 style={sectionHeading}>
              {group.label} ({group.items.length})
            </h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {group.items.map((item) => (
                <li
                  key={`${item.type}:${item.id}`}
                  style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
                >
                  <div>
                    <div>
                      {item.type === "deadline" ? "⏰ " : "✅ "}
                      {item.courseName && (
                        <span
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: item.courseColor || "#8b93a7",
                            marginRight: 4,
                          }}
                        />
                      )}
                      {item.courseName ? <strong>[{item.courseName}] </strong> : null}
                      {item.title}
                      {item.context && <span style={{ color: "#8b93a7" }}> — {item.context}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#8b93a7" }}>Done {formatUserDateTime(item.doneAt)}</div>
                  </div>
                  <form
                    method="POST"
                    action={item.type === "deadline" ? `/api/deadlines/${item.id}/uncomplete` : `/api/tasks/${item.id}/reopen`}
                  >
                    <button type="submit" style={undoButtonStyle}>
                      Undo
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}

const undoButtonStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #2a2f3a",
  color: "#8b93a7",
  borderRadius: 6,
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: 12,
  flexShrink: 0,
};
