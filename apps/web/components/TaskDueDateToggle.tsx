"use client";

import { useState } from "react";
import { DeadlineDateFields } from "@/components/DeadlineDateFields";

// A due date is optional for tasks (unlike deadlines, which always have
// one) - conditionally rendering DeadlineDateFields, rather than always
// rendering it and trying to mark it "empty", means the dueDate/dueTime
// hidden inputs simply don't exist in the form when this is off.
export function TaskDueDateToggle() {
  const [enabled, setEnabled] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#8b93a7" }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Set a due date (adds Telegram reminders)
      </label>
      {enabled && (
        <>
          <DeadlineDateFields />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#8b93a7" }}>
            Repeats
            <select name="recurrence" defaultValue="NONE" style={{ width: "auto" }}>
              <option value="NONE">Never</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </label>
        </>
      )}
    </div>
  );
}
