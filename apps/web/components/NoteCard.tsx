"use client";

import { useState } from "react";
import { cardStyle, inputStyle, buttonLinkStyle } from "@/lib/ui";

const TRUNCATE_LENGTH = 220;

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

export function NoteCard({
  id,
  category,
  content,
  dateLabel,
  showCategory,
  pinned,
}: {
  id: string;
  category: string;
  content: string;
  dateLabel: string;
  showCategory: boolean;
  pinned: boolean;
}) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isLong = content.length > TRUNCATE_LENGTH;
  const displayText = expanded || !isLong ? content : `${content.slice(0, TRUNCATE_LENGTH)}…`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser (e.g. no HTTPS,
      // permissions policy) - failing silently is fine, nothing is lost.
    }
  }

  return (
    <li style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8b93a7" }}>
        <span>
          {pinned && "📌 "}
          {showCategory && <strong>{category}</strong>} · {dateLabel}
        </span>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={handleCopy} style={linkButtonStyle}>
            {copied ? "Copied!" : "Copy"}
          </button>
          <form method="POST" action={`/api/notes/${id}/pin`}>
            <button type="submit" style={linkButtonStyle}>
              {pinned ? "Unpin" : "Pin"}
            </button>
          </form>
          <button type="button" onClick={() => setMode(mode === "edit" ? "view" : "edit")} style={linkButtonStyle}>
            {mode === "edit" ? "Cancel" : "Edit"}
          </button>
          <form method="POST" action={`/api/notes/${id}/delete`}>
            <button type="submit" style={linkButtonStyle}>
              Delete
            </button>
          </form>
        </div>
      </div>

      {mode === "view" ? (
        <>
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{linkify(displayText)}</p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              style={{ ...linkButtonStyle, color: "#4f7cff", alignSelf: "flex-start" }}
            >
              {expanded ? "Show less" : "See more"}
            </button>
          )}
        </>
      ) : (
        <form method="POST" action={`/api/notes/${id}`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input name="category" defaultValue={category} required list="category-options" style={inputStyle} />
          <textarea
            name="content"
            defaultValue={content}
            required
            rows={6}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
          <button type="submit" style={{ ...buttonLinkStyle, border: "none", cursor: "pointer", alignSelf: "flex-start" }}>
            Save changes
          </button>
        </form>
      )}
    </li>
  );
}

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#8b93a7",
  cursor: "pointer",
  fontSize: 12,
  padding: 0,
};
