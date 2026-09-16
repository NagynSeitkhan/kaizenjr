"use client";

import { useEffect, useRef } from "react";
import { inputStyle } from "@/lib/ui";

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Native <input type="datetime-local"> bundles date+time into one widget
// whose internal segments need manual arrow-key/tab navigation - confusing
// UX. Splitting into two plain inputs and auto-focusing the time field once
// a date is picked gives the "pick date, it moves on to time" flow directly.
export function DeadlineDateFields() {
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Set imperatively (not via defaultValue) so the server-rendered HTML
    // and the client's first paint never disagree on "today" - defaultValue
    // computed from Date() at render time would risk a hydration mismatch
    // since the server (Vercel, UTC) and the browser (Astana) can land on
    // different calendar days near midnight.
    if (dateRef.current && !dateRef.current.value) {
      dateRef.current.value = todayISODate();
    }
  }, []);

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <input
        name="dueDate"
        type="date"
        required
        ref={dateRef}
        style={{ ...inputStyle, flex: 1, colorScheme: "dark" }}
        onChange={(e) => {
          if (e.target.value) timeRef.current?.focus();
        }}
      />
      <input
        name="dueTime"
        type="time"
        required
        defaultValue="09:00"
        ref={timeRef}
        style={{ ...inputStyle, flex: 1, colorScheme: "dark" }}
      />
    </div>
  );
}
