import Link from "next/link";

import { signIn } from "@/auth";
import { HeroPreview } from "@/components/marketing/HeroPreview";
import { WhaleTicker } from "@/components/marketing/WhaleTicker";
import { MeshGradient } from "@/components/motion/MeshGradient";
import type { TradeRow } from "@/components/TradesTable/TradesTable";
import { prisma } from "@/lib/db/prisma";
import styles from "./signin.module.scss";

// Pulls a few recent whale trades for the live showcase, so it renders per
// request. Degrades gracefully (empty ticker) if the DB is unavailable.
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const recent = await prisma.trade
    .findMany({
      where: { isWhale: true },
      orderBy: { ts: "desc" },
      take: 10,
      select: {
        id: true,
        wallet: true,
        side: true,
        sizeUsdc: true,
        price: true,
        outcome: true,
        ts: true,
        market: { select: { id: true, question: true } },
      },
    })
    .catch(() => []);

  const trades: TradeRow[] = recent.map((t) => ({
    id: t.id,
    wallet: t.wallet,
    side: t.side,
    sizeUsdc: t.sizeUsdc,
    price: t.price,
    outcome: t.outcome,
    ts: t.ts,
    market: t.market,
  }));

  return (
    <div className={styles.shell}>
      <MeshGradient />

      {/* Left — authentication */}
      <div className={styles.authPane}>
        <div className={styles.authInner}>
          <div className={styles.header}>
            <Link href="/" className={styles.brand}>
              <span className={styles.brandMark} aria-hidden />
              EdgeBoard
            </Link>
            <h1 className={styles.headline}>Welcome back</h1>
            <p className={styles.subtitle}>
              Sign in to track smart money, price history and your whole
              portfolio P&amp;L.
            </p>
          </div>

          <div className={styles.card}>
            {/* Google OAuth */}
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <button type="submit" className={styles.googleBtn}>
                Continue with Google
              </button>
            </form>

            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              or
              <span className={styles.dividerLine} />
            </div>

            {/* Email magic link (Resend) */}
            <form
              action={async (formData: FormData) => {
                "use server";
                const email = formData.get("email");
                await signIn("resend", {
                  email: typeof email === "string" ? email : "",
                  redirectTo: "/dashboard",
                });
              }}
              className={styles.form}
            >
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className={styles.input}
              />
              <button type="submit" className={styles.submitBtn}>
                Send magic link
              </button>
            </form>
          </div>

          <p className={styles.disclaimer}>
            Information only, not financial advice.
          </p>
        </div>
      </div>

      {/* Right — live product showcase (decorative) */}
      <aside className={styles.showcase} aria-hidden>
        <div className={styles.showcaseInner}>
          <span className={styles.showcaseEyebrow}>
            Smart money analytics for Polymarket
          </span>
          <h2 className={styles.showcaseTitle}>
            See what whales are doing —{" "}
            <span className={styles.showcaseAccent}>before everyone else.</span>
          </h2>
          <div className={styles.previewWrap}>
            <HeroPreview />
          </div>
          <WhaleTicker trades={trades} />
        </div>
      </aside>
    </div>
  );
}
