import Link from "next/link";
import { prisma } from "@course-dashboard/db";
import { formatUserDateTime } from "@course-dashboard/shared";
import { Banner, cardStyle, sectionHeading, pageTitleStyle } from "@/lib/ui";

export const dynamic = "force-dynamic";

const RETENTION_DAYS = 30;

export default async function TrashPage({
  searchParams,
}: {
  searchParams: Promise<{ restored?: string; purged?: string }>;
}) {
  const params = await searchParams;

  const [notes, tasks, deadlines] = await Promise.all([
    prisma.note.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
    prisma.task.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
    prisma.deadline.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
  ]);

  const empty = notes.length === 0 && tasks.length === 0 && deadlines.length === 0;

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={pageTitleStyle}>Trash</h1>
        <Link href="/" style={{ color: "#8b93a7", fontSize: 14 }}>
          ← Dashboard
        </Link>
      </header>

      <p style={{ margin: 0, fontSize: 13, color: "#8b93a7" }}>
        Deleted items sit here for {RETENTION_DAYS} days before being permanently removed.
      </p>

      {params.restored && <Banner tone="success">Restored.</Banner>}
      {params.purged && <Banner tone="success">Permanently deleted.</Banner>}

      {empty && <p style={{ color: "#8b93a7" }}>Trash is empty.</p>}

      {notes.length > 0 && (
        <section>
          <h2 style={sectionHeading}>Notes ({notes.length})</h2>
          <TrashList
            items={notes.map((n) => ({
              id: n.id,
              title: `[${n.category}] ${n.content.length > 80 ? `${n.content.slice(0, 80)}…` : n.content}`,
              deletedAt: n.deletedAt!,
              basePath: "/api/notes",
            }))}
          />
        </section>
      )}

      {tasks.length > 0 && (
        <section>
          <h2 style={sectionHeading}>Tasks ({tasks.length})</h2>
          <TrashList
            items={tasks.map((t) => ({
              id: t.id,
              title: t.title,
              deletedAt: t.deletedAt!,
              basePath: "/api/tasks",
            }))}
          />
        </section>
      )}

      {deadlines.length > 0 && (
        <section>
          <h2 style={sectionHeading}>Deadlines ({deadlines.length})</h2>
          <TrashList
            items={deadlines.map((d) => ({
              id: d.id,
              title: d.title,
              deletedAt: d.deletedAt!,
              basePath: "/api/deadlines",
            }))}
          />
        </section>
      )}
    </main>
  );
}

function TrashList({
  items,
}: {
  items: { id: string; title: string; deletedAt: Date; basePath: string }[];
}) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item) => (
        <li
          key={item.id}
          style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
        >
          <div>
            <div>{item.title}</div>
            <div style={{ fontSize: 12, color: "#8b93a7" }}>Deleted {formatUserDateTime(item.deletedAt)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <form method="POST" action={`${item.basePath}/${item.id}/restore`}>
              <button type="submit" style={actionButtonStyle}>
                Restore
              </button>
            </form>
            <form method="POST" action={`${item.basePath}/${item.id}/purge`}>
              <button type="submit" style={{ ...actionButtonStyle, color: "#f28b82" }}>
                Delete forever
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

const actionButtonStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #2a2f3a",
  color: "#8b93a7",
  borderRadius: 6,
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: 12,
};
