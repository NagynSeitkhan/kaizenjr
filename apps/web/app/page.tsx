import { prisma } from "@course-dashboard/db";

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ googleConnected?: string; googleError?: string }>;
}) {
  const params = await searchParams;
  const [googleCred, deadlines, courses, tasks] = await Promise.all([
    prisma.integrationCredential.findUnique({ where: { provider: "google" } }),
    prisma.deadline.findMany({
      where: { dueAt: { gte: new Date() } },
      include: { course: true },
      orderBy: { dueAt: "asc" },
      take: 20,
    }),
    prisma.course.count(),
    prisma.task.findMany({
      include: { status: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const googleConnected = Boolean(googleCred?.refreshTokenEnc);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Dashboard</h1>
        <form method="POST" action="/api/auth/logout">
          <button
            type="submit"
            style={{ background: "none", border: "none", color: "#8b93a7", cursor: "pointer" }}
          >
            Log out
          </button>
        </form>
      </header>

      {params.googleConnected && (
        <Banner tone="success">Google account connected.</Banner>
      )}
      {params.googleError && (
        <Banner tone="error">Google connection failed: {params.googleError}</Banner>
      )}

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Google account</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8b93a7" }}>
              {googleConnected
                ? `Connected${googleCred?.lastSuccessAt ? ` · last synced ${formatDate(googleCred.lastSuccessAt)}` : ""}`
                : "Not connected — needed for Calendar, Sheets, and Gmail sync."}
              {googleCred?.lastErrorMsg && (
                <span style={{ color: "#f28b82" }}> · last error: {googleCred.lastErrorMsg}</span>
              )}
            </p>
          </div>
          {!googleConnected && <a href="/api/auth/google" style={buttonLinkStyle}>Connect Google</a>}
        </div>
      </section>

      <section>
        <h2 style={sectionHeading}>Upcoming ({deadlines.length}) · {courses} courses tracked</h2>
        {deadlines.length === 0 ? (
          <p style={{ color: "#8b93a7" }}>Nothing upcoming yet — connect Google and wait for the next sync.</p>
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

      <section>
        <h2 style={sectionHeading}>Tasks ({tasks.length})</h2>
        {tasks.length === 0 ? (
          <p style={{ color: "#8b93a7" }}>
            No tasks yet — add rows to the Tasks tab of your Google Sheet.
          </p>
        ) : (
          <ul style={listStyle}>
            {tasks.map((t) => (
              <li key={t.id} style={itemStyle}>
                <span>{t.title}</span>
                <span style={{ color: "#8b93a7", fontSize: 13 }}>{t.status?.state ?? "UNKNOWN"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Banner({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        background: tone === "success" ? "#12331f" : "#3a1414",
        color: tone === "success" ? "#7ee2a8" : "#f28b82",
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#151821",
  borderRadius: 12,
  padding: 16,
};

const sectionHeading: React.CSSProperties = {
  fontSize: 15,
  color: "#8b93a7",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 10,
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const itemStyle: React.CSSProperties = {
  background: "#151821",
  borderRadius: 8,
  padding: "10px 14px",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
};

const buttonLinkStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  background: "#4f7cff",
  color: "white",
  textDecoration: "none",
  fontSize: 14,
};
