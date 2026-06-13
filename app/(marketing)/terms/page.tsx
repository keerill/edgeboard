import type { Metadata } from "next";

import { Prose } from "@/components/Prose/Prose";

export const metadata: Metadata = {
  title: "Terms of Service — EdgeBoard",
  description:
    "Terms of Service for EdgeBoard, a read-only analytics tool for Polymarket prediction-market data.",
};

export default function TermsPage() {
  return (
    <Prose>
      <h1>Terms of Service</h1>
      <p>
        <small>Last updated: 13 June 2026</small>
      </p>
      <p>
        EdgeBoard (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides a subscription
        analytics service for publicly available Polymarket prediction-market
        data. By creating an account or using the service you agree to these
        terms.
      </p>

      <h2>What EdgeBoard is</h2>
      <p>
        EdgeBoard is a read-only information tool. It aggregates public market
        metadata, prices and on-chain trade activity and presents analytics such
        as large-trade (&ldquo;whale&rdquo;) feeds, price history and portfolio
        P&amp;L for public wallet addresses you choose to track.
      </p>

      <h2>What EdgeBoard is not</h2>
      <ul>
        <li>It does not place bets, orders or trades on your behalf.</li>
        <li>It does not custody funds or hold any private keys.</li>
        <li>It never connects a wallet or requests transaction signatures.</li>
        <li>It does not sell predictions, tips or guaranteed outcomes.</li>
      </ul>
      <p>
        Wallet addresses are public on-chain identifiers that you enter manually
        as plain text. Any address you track is treated as public information.
      </p>

      <h2>Not financial advice</h2>
      <p>
        <strong>Information only, not financial advice.</strong> Nothing on this
        site constitutes investment, legal or tax advice. Analytics — including
        any estimated P&amp;L or win rate — are derived from public data on a
        best-effort basis, may be incomplete or delayed, and are provided
        &ldquo;as is&rdquo; without warranty. You are solely responsible for your
        own decisions. Prediction markets carry risk and may be restricted in
        your jurisdiction.
      </p>

      <h2>Accounts and subscriptions</h2>
      <p>
        You are responsible for keeping your sign-in details secure. The Pro plan
        is billed through Stripe; you can upgrade, change or cancel at any time
        from the billing portal. Fees already paid are non-refundable except
        where required by law. We may change plan features or pricing with
        reasonable notice.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Do not attempt to disrupt the service, scrape it at abusive rates, or use
        it in violation of Polymarket&rsquo;s terms or applicable law. We may
        suspend accounts that do.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms from time to time. Continued use after an
        update means you accept the revised terms. Questions? See our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </Prose>
  );
}
