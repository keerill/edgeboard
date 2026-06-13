import type { Metadata } from "next";

import { PostHogProvider } from "@/components/Analytics/PostHogProvider";
import "./globals.scss";

export const metadata: Metadata = {
  title: "EdgeBoard — Smart money analytics for Polymarket",
  description:
    "Track whale moves, price history with big trades, and your whole P&L in one place. Information only, not financial advice.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
