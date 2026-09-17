import Link from "next/link";
import { prisma } from "@course-dashboard/db";
import { formatUserDateTime } from "@course-dashboard/shared";
import {
  Banner,
  cardStyle,
  sectionHeading,
  inputStyle,
  buttonLinkStyle,
  pillStyle,
  pageTitleStyle,
} from "@/lib/ui";
import { NoteCard } from "@/components/NoteCard";

export const dynamic = "force-dynamic";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    q?: string;
    formError?: string;
    added?: string;
    deleted?: string;
    updated?: string;
    reminded?: string;
  }>;
}) {
  const params = await searchParams;
  const activeCategory = params.category?.trim() || null;
  const query = params.q?.trim() || null;

  const [categoryRows, notes] = await Promise.all([
    prisma.note.findMany({
      where: { deletedAt: null },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.note.findMany({
      where: {
        deletedAt: null,
        category: activeCategory ?? undefined,
        ...(query
          ? {
              OR: [
                { content: { contains: query, mode: "insensitive" } },
                { category: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
  ]);
  const categories = categoryRows.map((c) => c.category);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={pageTitleStyle}>Notes</h1>
        <Link href="/" style={{ color: "#8b93a7", fontSize: 14 }}>
          ← Dashboard
        </Link>
      </header>

      {params.formError && <Banner tone="error">{params.formError}</Banner>}
      {params.added && <Banner tone="success">Note added.</Banner>}
      {params.deleted && <Banner tone="success">Note deleted.</Banner>}
      {params.updated && <Banner tone="success">Note updated.</Banner>}
      {params.reminded && <Banner tone="success">Reminder set — check the dashboard's Upcoming list.</Banner>}

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

      <form method="GET" action="/notes" style={{ display: "flex", gap: 8 }}>
        <input name="q" placeholder="Search notes..." defaultValue={query ?? ""} style={{ ...inputStyle, flex: 1 }} />
        <button type="submit" style={{ ...buttonLinkStyle, border: "none", cursor: "pointer" }}>
          Search
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
          {query ? `Results for "${query}"` : activeCategory ?? "All notes"} ({notes.length})
        </h2>
        {notes.length === 0 ? (
          <p style={{ color: "#8b93a7" }}>No notes yet.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {notes.map((n) => (
              <NoteCard
                key={n.id}
                id={n.id}
                category={n.category}
                content={n.content}
                dateLabel={formatUserDateTime(n.createdAt)}
                showCategory={!activeCategory}
                pinned={n.pinned}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
