import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { PostHogProvider } from "@/components/Analytics/PostHogProvider";
import { ThemeProvider } from "@/components/Theme/ThemeProvider";
import "./globals.scss";

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EdgeBoard — Smart money analytics for Polymarket",
  description:
    "Track whale moves, price history with big trades, and your whole P&L in one place. Information only, not financial advice.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable}`}
    >
      <body>
        <ThemeProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
