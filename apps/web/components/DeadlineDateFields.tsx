"use client";

import { useEffect, useRef, useState } from "react";
import { inputStyle } from "@/lib/ui";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Renders every date/time value with our own literal text (day numbers,
// zero-padded hour/minute options) instead of a native <input type="date"/
// "time">, whose *display* format follows the OS/browser locale and can't
// be forced from the page - the underlying submitted value was always
// locale-independent (YYYY-MM-DD / HH:mm), only the on-screen rendering
// wasn't controllable. This sidesteps that entirely.
export function DeadlineDateFields() {
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null); // 0-11
  const [day, setDay] = useState<number | null>(null);
  const [viewYear, setViewYear] = useState<number | null>(null);
  const [viewMonth, setViewMonth] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const hourRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    // Set today via effect (client-only) rather than at render time, so the
    // server-rendered HTML (built on Vercel, UTC) and the client's first
    // paint (the user, Astana) can't disagree near the UTC/Astana day
    // boundary and trigger a hydration mismatch.
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setDay(now.getDate());
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }, []);

  function selectDay(d: number) {
    setYear(viewYear);
    setMonth(viewMonth);
    setDay(d);
    setOpen(false);
    hourRef.current?.focus();
  }

  function changeMonth(delta: number) {
    if (viewMonth === null || viewYear === null) return;
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  const ready = year !== null && month !== null && day !== null && viewYear !== null && viewMonth !== null;
  const displayDate = ready ? `${pad(day)}/${pad(month + 1)}/${year}` : "dd/mm/yyyy";
  const isoDate = ready ? `${year}-${pad(month + 1)}-${pad(day)}` : "";

  const firstWeekday = ready ? new Date(viewYear, viewMonth, 1).getDay() : 0;
  const daysInMonth = ready ? new Date(viewYear, viewMonth + 1, 0).getDate() : 0;
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const minutes = Array.from({ length: 12 }, (_, i) => pad(i * 5));

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ position: "relative", flex: 1 }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{ ...inputStyle, width: "100%", textAlign: "left", cursor: "pointer" }}
        >
          {displayDate}
        </button>
        <input type="hidden" name="dueDate" value={isoDate} />

        {open && ready && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                zIndex: 20,
                background: "#151821",
                border: "1px solid #2a2f3a",
                borderRadius: 10,
                padding: 12,
                width: 260,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <button type="button" onClick={() => changeMonth(-1)} style={navButtonStyle}>
                  ‹
                </button>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button type="button" onClick={() => changeMonth(1)} style={navButtonStyle}>
                  ›
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
                {WEEKDAY_LABELS.map((w) => (
                  <div key={w} style={{ textAlign: "center", fontSize: 11, color: "#8b93a7" }}>
                    {w}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {cells.map((c, i) =>
                  c === null ? (
                    <div key={i} />
                  ) : (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectDay(c)}
                      style={dayButtonStyle(c === day && viewMonth === month && viewYear === year)}
                    >
                      {c}
                    </button>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <select value={hour} onChange={(e) => setHour(e.target.value)} ref={hourRef} style={{ ...inputStyle, flex: 1 }}>
        {hours.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <select value={minute} onChange={(e) => setMinute(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <input type="hidden" name="dueTime" value={`${hour}:${minute}`} />
    </div>
  );
}

const navButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#e6e8ec",
  cursor: "pointer",
  fontSize: 16,
  padding: "2px 8px",
};

function dayButtonStyle(selected: boolean): React.CSSProperties {
  return {
    background: selected ? "#4f7cff" : "none",
    border: "none",
    color: selected ? "white" : "#e6e8ec",
    borderRadius: 6,
    padding: "6px 0",
    cursor: "pointer",
    fontSize: 13,
  };
}
