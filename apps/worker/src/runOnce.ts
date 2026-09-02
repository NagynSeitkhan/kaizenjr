import "dotenv/config";
import { syncCalendar } from "./integrations/google/calendar";
import { syncTasksSheet } from "./integrations/sheets/tasksSheet";
import { runDailyDigest } from "./jobs/dailyDigest";
import { checkDeadlineReminders } from "./jobs/checkDeadlineReminders";

// Single-invocation entrypoint for a scheduler that isn't a long-running
// process (e.g. GitHub Actions `schedule` cron) - runs every job once, then
// exits. Contrast with index.ts, which self-schedules via node-cron for
// always-on hosting. Each job is independent and self-contained (own
// try/catch + dedup), so one failing does not block the others.
async function main(): Promise<void> {
  const jobs: Array<[string, () => Promise<void>]> = [
    ["syncCalendar", syncCalendar],
    ["syncTasksSheet", syncTasksSheet],
    ["checkDeadlineReminders", checkDeadlineReminders],
    ["runDailyDigest", runDailyDigest],
  ];

  for (const [name, fn] of jobs) {
    try {
      await fn();
    } catch (err) {
      console.error(`[runOnce] job "${name}" threw unexpectedly:`, err);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[runOnce] fatal:", err);
    process.exit(1);
  });
