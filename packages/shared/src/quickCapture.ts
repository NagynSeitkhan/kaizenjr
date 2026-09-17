import * as chrono from "chrono-node";
import { prisma } from "@course-dashboard/db";

const URL_REGEX = /https?:\/\/[^\s]+/i;
const HASHTAG_REGEX = /#(\w+)/;
const ASTANA_UTC_OFFSET_MINUTES = 300; // UTC+5, no DST

export interface QuickCaptureResult {
  kind: "note" | "deadline" | "task";
  summary: string;
}

function extractUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

function extractHashtag(text: string): { tag: string; remaining: string } | null {
  const match = text.match(HASHTAG_REGEX);
  if (!match) return null;
  const tag = match[1];
  const remaining = (text.slice(0, match.index) + text.slice((match.index ?? 0) + match[0].length)).trim();
  return { tag, remaining };
}

function extractDate(text: string): { date: Date; remaining: string } | null {
  const results = chrono.parse(text, { instant: new Date(), timezone: ASTANA_UTC_OFFSET_MINUTES });
  if (results.length === 0) return null;
  const r = results[0];
  const remaining = (text.slice(0, r.index) + text.slice(r.index + r.text.length)).trim();
  return { date: r.start.date(), remaining };
}

async function fetchLinkTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = match?.[1]?.trim();
    return title ? title.replace(/\s+/g, " ") : null;
  } catch {
    // A slow, broken, or paywalled site just falls back to the raw URL -
    // not worth failing the whole capture over a best-effort title fetch.
    return null;
  }
}

// The single classification heuristic shared by the Telegram bot and the
// dashboard's quick-add box, so "type a thing, it becomes the right kind of
// record" behaves identically no matter where it's typed from:
//   contains a #tag             -> Note (category = tag)
//   contains a URL (no tag)     -> Note (category "Inbox"), title auto-fetched
//   contains a date/time phrase -> Deadline
//   otherwise                   -> Task
export async function processQuickCapture(
  rawText: string,
  source: { sourceType: "TELEGRAM" | "MANUAL"; sourceRef: string }
): Promise<QuickCaptureResult> {
  const text = rawText.trim();
  const hashtag = extractHashtag(text);
  const url = extractUrl(hashtag?.remaining ?? text);

  if (hashtag) {
    let content = hashtag.remaining;
    if (url) {
      const title = await fetchLinkTitle(url);
      content = title ? `${title}\n${url}` : content;
    }
    await prisma.note.create({ data: { category: hashtag.tag, content: content || url || text } });
    return { kind: "note", summary: `Saved as a note (${hashtag.tag}).` };
  }

  if (url) {
    const title = await fetchLinkTitle(url);
    const content = title ? `${title}\n${url}` : text;
    await prisma.note.create({ data: { category: "Inbox", content } });
    return { kind: "note", summary: `Saved as a note (Inbox)${title ? `: "${title}"` : ""}.` };
  }

  const parsedDate = extractDate(text);
  if (parsedDate) {
    const title = parsedDate.remaining || text;
    await prisma.deadline.create({
      data: {
        title,
        dueAt: parsedDate.date,
        source: "MANUAL",
        externalId: `${source.sourceType}:${source.sourceRef}`,
      },
    });
    return { kind: "deadline", summary: `Saved as a deadline: "${title}".` };
  }

  const task = await prisma.task.create({
    data: {
      title: text,
      sourceType: source.sourceType,
      sourceRef: source.sourceRef,
    },
  });
  await prisma.taskStatus.create({ data: { taskId: task.id, state: "PENDING", source: "quick_capture" } });
  return { kind: "task", summary: `Saved as a task: "${text}".` };
}
