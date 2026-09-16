"use client";

import { useRef } from "react";
import { inputStyle } from "@/lib/ui";

// Native <input type="datetime-local"> bundles date+time into one widget
// whose internal segments need manual arrow-key/tab navigation - confusing
// UX. Splitting into two plain inputs and auto-focusing the time field once
// a date is picked gives the "pick date, it moves on to time" flow directly.
export function DeadlineDateFields() {
  const timeRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <input
        name="dueDate"
        type="date"
        required
        style={{ ...inputStyle, flex: 1 }}
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
        style={{ ...inputStyle, flex: 1 }}
      />
    </div>
  );
}
