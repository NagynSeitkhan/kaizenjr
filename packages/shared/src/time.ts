// This app has one user, based in Kazakhstan (UTC+5 nationwide, no DST).
// Centralizing the assumption here so parsing (forms) and display (dashboard,
// Telegram messages) agree - drifting these apart is exactly what caused the
// "I typed 9pm, it shows 4pm" bug.
export const USER_TIMEZONE = "Asia/Almaty";
export const USER_UTC_OFFSET = "+05:00";

export function formatUserDateTime(d: Date): string {
  return d.toLocaleString("en-US", {
    timeZone: USER_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Servers (Vercel, GitHub Actions) run with TZ=UTC, so Date.getHours() would
// answer "what hour is it in UTC", not "what hour is it for the user" - the
// same class of bug as the datetime-local parsing above.
export function currentHourForUser(): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: USER_TIMEZONE,
    hour: "numeric",
    hourCycle: "h23",
  }).format(new Date());
  return Number(formatted);
}
