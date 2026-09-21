import "dotenv/config";
import cron from "node-cron";
import { syncCalendar } from "./integrations/google/calendar";
import { syncTasksSheet } from "./integrations/sheets/tasksSheet";
import { runDailyDigest } from "./jobs/dailyDigest";
import { runWeeklyDigest } from "./jobs/weeklyDigest";
import { checkDeadlineReminders } from "./jobs/checkDeadlineReminders";
import { checkTaskReminders } from "./jobs/checkTaskReminders";
import { sendUrgentNags } from "./jobs/urgentNags";
import { advanceRecurringDeadlines } from "./jobs/advanceRecurring";
import { purgeOldTrash } from "./jobs/purgeOldTrash";

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
cron.schedule("*/15 * * * *", () => runSafely("checkDeadlineReminders", checkDeadlineReminders));
cron.schedule("*/15 * * * *", () => runSafely("checkTaskReminders", checkTaskReminders));
cron.schedule("*/10 * * * *", () => runSafely("sendUrgentNags", sendUrgentNags));
cron.schedule("*/10 * * * *", () => runSafely("advanceRecurringDeadlines", advanceRecurringDeadlines));
cron.schedule("*/15 * * * *", () => runSafely("dailyDigest", runDailyDigest));
cron.schedule("*/15 * * * *", () => runSafely("weeklyDigest", runWeeklyDigest));
cron.schedule("0 * * * *", () => runSafely("purgeOldTrash", purgeOldTrash));

// Run once immediately on boot so a fresh deploy doesn't wait for the first tick.
void runSafely("syncCalendar", syncCalendar);
void runSafely("syncTasksSheet", syncTasksSheet);
void runSafely("checkDeadlineReminders", checkDeadlineReminders);
void runSafely("checkTaskReminders", checkTaskReminders);
void runSafely("sendUrgentNags", sendUrgentNags);
void runSafely("advanceRecurringDeadlines", advanceRecurringDeadlines);
void runSafely("dailyDigest", runDailyDigest);
void runSafely("weeklyDigest", runWeeklyDigest);
void runSafely("purgeOldTrash", purgeOldTrash);
