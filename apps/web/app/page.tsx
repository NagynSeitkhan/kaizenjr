import Link from "next/link";
import { prisma } from "@course-dashboard/db";
import { formatUserDateTime as formatDate } from "@course-dashboard/shared";
import { Banner, cardStyle, sectionHeading, listStyle, itemStyle, buttonLinkStyle, inputStyle } from "@/lib/ui";
import { DeadlineDateFields } from "@/components/DeadlineDateFields";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    googleConnected?: string;
    googleError?: string;
    added?: string;
    formError?: string;
  }>;
}) {
  const params = await searchParams;
  const [googleCred, deadlines, courses, openTasks, doneCount] = await Promise.all([
    prisma.integrationCredential.findUnique({ where: { provider: "google" } }),
    prisma.deadline.findMany({
      where: { dueAt: { gte: new Date() } },
      include: { course: true },
      orderBy: { dueAt: "asc" },
      take: 20,
    }),
    prisma.course.count(),
    prisma.task.findMany({
      where: { status: { state: { not: "DONE" } } },
      include: { status: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.task.count({ where: { status: { state: "DONE" } } }),
  ]);

  const googleConnected = Boolean(googleCred?.refreshTokenEnc);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Dashboard</h1>
        <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
          <Link href="/notes" style={{ color: "#8b93a7", fontSize: 14 }}>
            Notes
          </Link>
          <form method="POST" action="/api/auth/logout">
            <button
              type="submit"
              style={{ background: "none", border: "none", color: "#8b93a7", cursor: "pointer" }}
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      {params.googleConnected && <Banner tone="success">Google account connected.</Banner>}
      {params.googleError && (
        <Banner tone="error">Google connection failed: {params.googleError}</Banner>
      )}
      {params.added === "deadline" && <Banner tone="success">Deadline added.</Banner>}
      {params.added === "task" && <Banner tone="success">Task added.</Banner>}
      {params.formError && <Banner tone="error">{params.formError}</Banner>}

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Google account</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8b93a7" }}>
              {googleConnected
                ? `Connected${googleCred?.lastSuccessAt ? ` · last synced ${formatDate(googleCred.lastSuccessAt)}` : ""}`
                : "Not connected — optional, only needed for Calendar/Sheets/Gmail sync."}
              {googleCred?.lastErrorMsg && (
                <span style={{ color: "#f28b82" }}> · last error: {googleCred.lastErrorMsg}</span>
              )}
            </p>
          </div>
          {!googleConnected && (
            <a href="/api/auth/google" style={buttonLinkStyle}>
              Connect Google
            </a>
          )}
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={sectionHeading}>Add a deadline</h2>
        <form
          method="POST"
          action="/api/deadlines"
          encType="multipart/form-data"
          style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <input name="title" placeholder="Title (e.g. CSCI 152 Assignment 3)" required style={inputStyle} />
          <DeadlineDateFields />
          <input name="description" placeholder="Notes (optional)" style={inputStyle} />
          <label style={{ fontSize: 13, color: "#8b93a7" }}>
            Attach a photo (optional) — sent along with the Telegram reminder
            <input name="image" type="file" accept="image/*" style={{ display: "block", marginTop: 6 }} />
          </label>
          <button type="submit" style={{ ...buttonLinkStyle, border: "none", cursor: "pointer", alignSelf: "flex-start" }}>
            Add deadline
          </button>
        </form>
      </section>

      <section>
        <h2 style={sectionHeading}>
          Upcoming ({deadlines.length}) · {courses} courses tracked
        </h2>
        {deadlines.length === 0 ? (
          <p style={{ color: "#8b93a7" }}>Nothing upcoming yet.</p>
        ) : (
          <ul style={listStyle}>
            {deadlines.map((d) => (
              <li key={d.id} style={itemStyle}>
                <span>
                  {d.course ? <strong>[{d.course.name}] </strong> : null}
                  {d.title}
                </span>
                <span style={{ color: "#8b93a7", fontSize: 13 }}>{formatDate(d.dueAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={sectionHeading}>Add a task</h2>
        <form
          method="POST"
          action="/api/tasks"
          style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <input name="title" placeholder="Task title" required style={inputStyle} />
          <input name="context" placeholder="Notes (optional)" style={inputStyle} />
          <button type="submit" style={{ ...buttonLinkStyle, border: "none", cursor: "pointer", alignSelf: "flex-start" }}>
            Add task
          </button>
        </form>
      </section>

      <section>
        <h2 style={sectionHeading}>
          Open tasks ({openTasks.length}) · {doneCount} done
        </h2>
        {openTasks.length === 0 ? (
          <p style={{ color: "#8b93a7" }}>Nothing pending.</p>
        ) : (
          <ul style={listStyle}>
            {openTasks.map((t) => (
              <li key={t.id} style={itemStyle}>
                <span>
                  {t.title}
                  {t.context && (
                    <span style={{ color: "#8b93a7" }}> — {t.context}</span>
                  )}
                </span>
                <form method="POST" action={`/api/tasks/${t.id}/complete`}>
                  <button
                    type="submit"
                    style={{
                      background: "none",
                      border: "1px solid #2a2f3a",
                      color: "#8b93a7",
                      borderRadius: 6,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Mark done
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
