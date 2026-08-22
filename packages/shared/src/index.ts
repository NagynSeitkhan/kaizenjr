export * from "./crypto";
export * from "./google";
export * from "./telegram";

export type NotificationKind = "DIGEST" | "T24H" | "T2H" | "MANUAL";

export interface DigestData {
  upcomingDeadlines: {
    title: string;
    courseName: string | null;
    dueAt: string;
    url: string | null;
  }[];
  pendingTasks: {
    title: string;
    context: string | null;
  }[];
  flaggedEmails: {
    subject: string;
    from: string;
    snippet: string;
  }[];
}
