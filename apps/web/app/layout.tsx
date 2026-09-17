import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { prisma } from "@course-dashboard/db";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "Course Dashboard",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // A layout-level crash takes down every page, including /login - unlike a
  // page-level error, app/error.tsx can't catch it (it renders nested inside
  // this layout). So a transient DB hiccup here must never be fatal: worst
  // case, the custom background is skipped for one request.
  let backgroundUrl: string | null = null;
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "backgroundUrl" } });
    backgroundUrl = setting?.value ?? null;
  } catch {
    backgroundUrl = null;
  }

  return (
    <html lang="en" className={inter.className}>
      <body
        style={{
          margin: 0,
          color: "#e6e8ec",
          lineHeight: 1.55,
          WebkitFontSmoothing: "antialiased",
          colorScheme: "dark",
          background: backgroundUrl
            ? `linear-gradient(rgba(11,13,18,0.85), rgba(11,13,18,0.85)), url(${backgroundUrl}) center/cover fixed no-repeat`
            : "#0b0d12",
        }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 16px" }}>{children}</div>
      </body>
    </html>
  );
}
