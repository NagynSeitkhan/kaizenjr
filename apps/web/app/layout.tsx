import type { ReactNode } from "react";

export const metadata = {
  title: "Course Dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          background: "#0b0d12",
          color: "#e6e8ec",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>{children}</div>
      </body>
    </html>
  );
}
