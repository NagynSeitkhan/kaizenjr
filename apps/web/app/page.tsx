import Link from "next/link";
import { prisma } from "@course-dashboard/db";
import { formatUserDateTime as formatDate } from "@course-dashboard/shared";
import {
  Banner,
  cardStyle,
  sectionHeading,
  listStyle,
  buttonLinkStyle,
  inputStyle,
  pageTitleStyle,
} from "@/lib/ui";
import { DeadlineDateFields } from "@/components/DeadlineDateFields";
import { TaskDueDateToggle } from "@/components/TaskDueDateToggle";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    googleConnected?: string;
    googleError?: string;
    added?: string;
    formError?: string;
    quickAdded?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const query = params.q?.trim() || null;

  // A search widens scope to everything matching the title (past deadlines,
  // completed tasks included) instead of just what's currently upcoming/open
  // - otherwise something you're trying to find because it's already done or
  // overdue would be invisible exactly when you're looking for it.
  const deadlineWhere = query
    ? { deletedAt: null, title: { contains: query, mode: "insensitive" as const } }
    : { dueAt: { gte: new Date() }, deletedAt: null };
  const taskWhere = query
    ? { deletedAt: null, title: { contains: query, mode: "insensitive" as const } }
    : { status: { state: { not: "DONE" as const } }, deletedAt: null };

  const [googleCred, deadlines, courseList, openTasks, doneCount, weekCount, noteCount, backgroundSetting] =
    await Promise.all([
      prisma.integrationCredential.findUnique({ where: { provider: "google" } }),
      prisma.deadline.findMany({
        where: deadlineWhere,
        include: { course: true },
        orderBy: { dueAt: "asc" },
        take: 30,
      }),
      prisma.course.findMany({ orderBy: { name: "asc" } }),
      prisma.task.findMany({
        where: taskWhere,
        include: { status: true },
        orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
        take: 30,
      }),
      prisma.task.count({ where: { status: { state: "DONE" }, deletedAt: null } }),
      prisma.deadline.count({ where: { dueAt: { gte: new Date(), lte: weekOut }, deletedAt: null } }),
      prisma.note.count({ where: { deletedAt: null } }),
      // .catch() here (not a wrapping try/catch) so a failure on just this
      // query can't reject the whole Promise.all and take the real content
      // (deadlines/tasks/notes) down with it.
      prisma.setting.findUnique({ where: { key: "backgroundUrl" } }).catch(() => null),
    ]);

  const googleConnected = Boolean(googleCred?.refreshTokenEnc);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={pageTitleStyle}>Dashboard</h1>
        <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
          <Link href="/notes" style={{ color: "#8b93a7", fontSize: 14 }}>
            Notes
          </Link>
          <Link href="/trash" style={{ color: "#8b93a7", fontSize: 14 }}>
            Trash
          </Link>
          <a href="/api/export" style={{ color: "#8b93a7", fontSize: 14 }}>
            Export
          </a>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <StatTile value={weekCount} label="Due this week" />
        <StatTile value={openTasks.length} label="Open tasks" />
        <StatTile value={noteCount} label="Notes" />
      </div>

      <form method="POST" action="/api/quick-add" style={{ display: "flex", gap: 8 }}>
        <input
          name="text"
          placeholder='Quick add: "call therapist tomorrow 5pm", a link, #tag idea, or just a task...'
          required
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="submit" style={{ ...buttonLinkStyle, border: "none", cursor: "pointer" }}>
          Add
        </button>
      </form>

      <form method="GET" action="/" style={{ display: "flex", gap: 8 }}>
        <input name="q" placeholder="Search tasks & deadlines..." defaultValue={query ?? ""} style={{ ...inputStyle, flex: 1 }} />
        <button type="submit" style={{ ...buttonLinkStyle, border: "none", cursor: "pointer" }}>
          Search
        </button>
        {query && (
          <Link href="/" style={toggleButtonStyle(false)}>
            Clear
          </Link>
        )}
      </form>

      {params.googleConnected && <Banner tone="success">Google account connected.</Banner>}
      {params.googleError && (
        <Banner tone="error">Google connection failed: {params.googleError}</Banner>
      )}
      {params.added === "deadline" && <Banner tone="success">Deadline added.</Banner>}
      {params.added === "task" && <Banner tone="success">Task added.</Banner>}
      {params.added === "background" && <Banner tone="success">Background updated.</Banner>}
      {params.added === "course" && <Banner tone="success">Course added.</Banner>}
      {params.quickAdded && <Banner tone="success">{params.quickAdded}</Banner>}
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
        <h2 style={sectionHeading}>Appearance</h2>
        <form
          method="POST"
          action="/api/settings/background"
          encType="multipart/form-data"
          style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <input name="url" placeholder="Background image URL (https://...)" style={inputStyle} />
          <label style={{ fontSize: 13, color: "#8b93a7" }}>
            ...or upload an image
            <input name="image" type="file" accept="image/*" style={{ display: "block", marginTop: 6 }} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={{ ...buttonLinkStyle, border: "none", cursor: "pointer" }}>
              Set background
            </button>
            {backgroundSetting && (
              <button
                type="submit"
                formAction="/api/settings/background/reset"
                style={toggleButtonStyle(false)}
              >
                Remove background
              </button>
            )}
          </div>
        </form>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={sectionHeading}>Courses</h2>
        {courseList.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {courseList.map((c) => (
              <span key={c.id} style={{ ...coursePillStyle, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: c.color || "#8b93a7",
                    display: "inline-block",
                  }}
                />
                {c.name}
              </span>
            ))}
          </div>
        )}
        <form
          method="POST"
          action="/api/courses"
          style={{ ...cardStyle, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
        >
          <input name="name" placeholder="Course name (e.g. CSCI 152)" required style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
          <input name="code" placeholder="Code (optional)" style={{ ...inputStyle, width: 120 }} />
          <input name="color" type="color" defaultValue="#7ee2a8" style={{ width: 44, height: 36, padding: 2, background: "none", border: "1px solid #2a2f3a", borderRadius: 6 }} />
          <button type="submit" style={{ ...buttonLinkStyle, border: "none", cursor: "pointer" }}>
            Add course
          </button>
        </form>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
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
              {courseList.length > 0 && (
                <select name="courseId" defaultValue="" style={inputStyle}>
                  <option value="">No course</option>
                  {courseList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              <input name="description" placeholder="Notes (optional)" style={inputStyle} />
              <label style={{ fontSize: 13, color: "#8b93a7", display: "flex", gap: 6, alignItems: "center" }}>
                <input name="urgent" type="checkbox" />
                🚨 Urgent — keep pinging on Telegram until I respond
              </label>
              <label style={{ fontSize: 13, color: "#8b93a7", display: "flex", gap: 6, alignItems: "center" }}>
                Repeats
                <select name="recurrence" defaultValue="NONE" style={{ ...inputStyle, width: "auto" }}>
                  <option value="NONE">Never</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </label>
              <label style={{ fontSize: 13, color: "#8b93a7" }}>
                Attach a photo (optional) — sent along with the Telegram reminder
                <input name="image" type="file" accept="image/*" style={{ display: "block", marginTop: 6 }} />
              </label>
              <button
                type="submit"
                style={{ ...buttonLinkStyle, border: "none", cursor: "pointer", alignSelf: "flex-start" }}
              >
                Add deadline
              </button>
            </form>
          </section>

          <section>
            <h2 style={sectionHeading}>
              {query ? `Deadlines matching "${query}"` : "Upcoming"} ({deadlines.length})
              {!query && ` · ${courseList.length} courses tracked`}
            </h2>
            {deadlines.length === 0 ? (
              <p style={{ color: "#8b93a7" }}>{query ? "No matches." : "Nothing upcoming yet."}</p>
            ) : (
              <ul style={listStyle}>
                {deadlines.map((d) => (
                  <li key={d.id} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span>
                        {d.urgent && "🚨 "}
                        {d.recurrence !== "NONE" && "🔁 "}
                        {d.course && (
                          <span
                            style={{
                              display: "inline-block",
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: d.course.color || "#8b93a7",
                              marginRight: 4,
                            }}
                          />
                        )}
                        {d.course ? <strong>[{d.course.name}] </strong> : null}
                        {d.title}
                      </span>
                      <span style={{ color: "#8b93a7", fontSize: 13, whiteSpace: "nowrap" }}>
                        {formatDate(d.dueAt)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <form method="POST" action={`/api/deadlines/${d.id}/toggle-notify`}>
                        <button type="submit" style={toggleButtonStyle(d.notifyEnabled)}>
                          {d.notifyEnabled ? "🔔 Notify: on" : "🔕 Notify: off"}
                        </button>
                      </form>
                      <form method="POST" action={`/api/deadlines/${d.id}/toggle-urgent`}>
                        <button type="submit" style={toggleButtonStyle(d.urgent)}>
                          {d.urgent ? "🚨 Urgent: on" : "Urgent: off"}
                        </button>
                      </form>
                      <form method="POST" action={`/api/deadlines/${d.id}/snooze`}>
                        <button type="submit" style={toggleButtonStyle(false)}>
                          +1 day
                        </button>
                      </form>
                      <form method="POST" action={`/api/deadlines/${d.id}/delete`}>
                        <button type="submit" style={toggleButtonStyle(false)}>
                          Delete
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={sectionHeading}>Add a task</h2>
            <form
              method="POST"
              action="/api/tasks"
              style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}
            >
              <input name="title" placeholder="Task title" required style={inputStyle} />
              <input name="context" placeholder="Notes (optional)" style={inputStyle} />
              <TaskDueDateToggle />
              <label style={{ fontSize: 13, color: "#8b93a7", display: "flex", gap: 6, alignItems: "center" }}>
                <input name="urgent" type="checkbox" />
                🚨 Urgent — keep pinging on Telegram until I respond
              </label>
              <button
                type="submit"
                style={{ ...buttonLinkStyle, border: "none", cursor: "pointer", alignSelf: "flex-start" }}
              >
                Add task
              </button>
            </form>
          </section>

          <section>
            <h2 style={sectionHeading}>
              {query ? `Tasks matching "${query}"` : "Open tasks"} ({openTasks.length})
              {!query && ` · ${doneCount} done`}
            </h2>
            {openTasks.length === 0 ? (
              <p style={{ color: "#8b93a7" }}>{query ? "No matches." : "Nothing pending."}</p>
            ) : (
              <ul style={listStyle}>
                {openTasks.map((t) => (
                  <li key={t.id} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span>
                        {t.urgent && "🚨 "}
                        {t.recurrence !== "NONE" && "🔁 "}
                        {t.title}
                        {t.context && <span style={{ color: "#8b93a7" }}> — {t.context}</span>}
                      </span>
                      {t.dueAt && (
                        <span style={{ color: "#8b93a7", fontSize: 13, whiteSpace: "nowrap" }}>
                          {formatDate(t.dueAt)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <form method="POST" action={`/api/tasks/${t.id}/complete`}>
                        <button type="submit" style={toggleButtonStyle(false)}>
                          Mark done
                        </button>
                      </form>
                      {t.dueAt && (
                        <form method="POST" action={`/api/tasks/${t.id}/snooze`}>
                          <button type="submit" style={toggleButtonStyle(false)}>
                            +1 day
                          </button>
                        </form>
                      )}
                      {t.dueAt && (
                        <form method="POST" action={`/api/tasks/${t.id}/toggle-urgent`}>
                          <button type="submit" style={toggleButtonStyle(t.urgent)}>
                            {t.urgent ? "🚨 Urgent: on" : "Urgent: off"}
                          </button>
                        </form>
                      )}
                      <form method="POST" action={`/api/tasks/${t.id}/delete`}>
                        <button type="submit" style={toggleButtonStyle(false)}>
                          Delete
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ ...cardStyle, textAlign: "center" }}>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#8b93a7", marginTop: 2 }}>{label}</div>
    </div>
  );
}

const coursePillStyle: React.CSSProperties = {
  border: "1px solid #2a2f3a",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  color: "#c7cbd6",
};

function toggleButtonStyle(active: boolean): React.CSSProperties {
  return {
    background: "none",
    border: "1px solid #2a2f3a",
    color: active ? "#7ee2a8" : "#8b93a7",
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: 12,
  };
}
