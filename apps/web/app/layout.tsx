import type { ReactNode } from "react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "Course Dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body
        style={{
          margin: 0,
          background: "#0b0d12",
          color: "#e6e8ec",
          lineHeight: 1.55,
          WebkitFontSmoothing: "antialiased",
          colorScheme: "dark",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>{children}</div>
      </body>
    </html>
  );
}
