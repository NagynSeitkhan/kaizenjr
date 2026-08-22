import "dotenv/config";
import cron from "node-cron";
import { syncCalendar } from "./integrations/google/calendar";
import { syncTasksSheet } from "./integrations/sheets/tasksSheet";
import { runDailyDigest } from "./jobs/dailyDigest";

async function runSafely(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[worker] job "${name}" threw unexpectedly:`, err);
  }
}

console.log("[worker] starting cron scheduler");

cron.schedule("*/30 * * * *", () => runSafely("syncCalendar", syncCalendar));
cron.schedule("*/45 * * * *", () => runSafely("syncTasksSheet", syncTasksSheet));
cron.schedule("*/15 * * * *", () => runSafely("dailyDigest", runDailyDigest));

// Run once immediately on boot so a fresh deploy doesn't wait for the first tick.
void runSafely("syncCalendar", syncCalendar);
void runSafely("syncTasksSheet", syncTasksSheet);
void runSafely("dailyDigest", runDailyDigest);
