import Link from "next/link";
import { prisma } from "@course-dashboard/db";
import { formatUserDateTime } from "@course-dashboard/shared";
import { Banner, cardStyle, sectionHeading, inputStyle, buttonLinkStyle, pillStyle } from "@/lib/ui";

export const dynamic = "force-dynamic";

function linkify(text: string): React.ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer noopener" style={{ color: "#4f7cff" }}>
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; formError?: string; added?: string; deleted?: string }>;
}) {
  const params = await searchParams;
  const activeCategory = params.category?.trim() || null;

  const [categoryRows, notes] = await Promise.all([
    prisma.note.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.note.findMany({
      where: activeCategory ? { category: activeCategory } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  const categories = categoryRows.map((c) => c.category);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Notes</h1>
        <Link href="/" style={{ color: "#8b93a7", fontSize: 14 }}>
          ← Dashboard
        </Link>
      </header>

      {params.formError && <Banner tone="error">{params.formError}</Banner>}
      {params.added && <Banner tone="success">Note added.</Banner>}
      {params.deleted && <Banner tone="success">Note deleted.</Banner>}

      <form
        method="POST"
        action="/api/notes"
        style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}
      >
        <input
          name="category"
          placeholder="Category (e.g. PhD, Work, Ideas)"
          required
          list="category-options"
          defaultValue={activeCategory ?? ""}
          style={inputStyle}
        />
        <datalist id="category-options">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <textarea
          name="content"
          placeholder="Note, link, or idea..."
          required
          rows={3}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
        <button
          type="submit"
          style={{ ...buttonLinkStyle, border: "none", cursor: "pointer", alignSelf: "flex-start" }}
        >
          Add note
        </button>
      </form>

      {categories.length > 0 && (
        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/notes" style={pillStyle(!activeCategory)}>
            All
          </Link>
          {categories.map((c) => (
            <Link key={c} href={`/notes?category=${encodeURIComponent(c)}`} style={pillStyle(activeCategory === c)}>
              {c}
            </Link>
          ))}
        </nav>
      )}

      <section>
        <h2 style={sectionHeading}>
          {activeCategory ?? "All notes"} ({notes.length})
        </h2>
        {notes.length === 0 ? (
          <p style={{ color: "#8b93a7" }}>No notes yet.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {notes.map((n) => (
              <li key={n.id} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8b93a7" }}>
                  <span>
                    {!activeCategory && <strong>{n.category}</strong>} · {formatUserDateTime(n.createdAt)}
                  </span>
                  <form method="POST" action={`/api/notes/${n.id}/delete`}>
                    <button
                      type="submit"
                      style={{ background: "none", border: "none", color: "#8b93a7", cursor: "pointer", fontSize: 12 }}
                    >
                      Delete
                    </button>
                  </form>
                </div>
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{linkify(n.content)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
