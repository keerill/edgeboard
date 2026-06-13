import type { Metadata } from "next";

import { Prose } from "@/components/Prose/Prose";

export const metadata: Metadata = {
  title: "Privacy Policy — EdgeBoard",
  description:
    "How EdgeBoard handles your data: account email, subscription status, and the public wallet addresses you choose to track.",
};

export default function PrivacyPage() {
  return (
    <Prose>
      <h1>Privacy Policy</h1>
      <p>
        <small>Last updated: 13 June 2026</small>
      </p>
      <p>
        We collect the minimum needed to run your account and keep it that way.
        This policy explains what we store, why, and who processes it.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>Your email address and sign-in data (via NextAuth).</li>
        <li>Your subscription plan and status.</li>
        <li>The public wallet addresses you choose to track, with optional labels.</li>
      </ul>
      <p>
        Wallet addresses are public on-chain identifiers entered manually. We
        never connect wallets, request signatures, or access private keys.
      </p>

      <h2>How we use it</h2>
      <p>
        We use your data only to provide the service: to authenticate you, to
        show analytics for the wallets you track, and to manage your
        subscription. We do not sell your personal data.
      </p>

      <h2>Processors we rely on</h2>
      <ul>
        <li>Stripe — payment and subscription billing.</li>
        <li>Our email provider — sign-in magic links and account email.</li>
        <li>Hosting and database providers — to run the application.</li>
        <li>
          Error monitoring and product analytics — to keep the service reliable
          and understand aggregate usage. These run only when configured and are
          used in an aggregate, privacy-respecting way.
        </li>
      </ul>
      <p>
        Market, price and trade data shown in EdgeBoard comes from Polymarket&rsquo;s
        public APIs and is not personal data about you.
      </p>

      <h2>Retention and your choices</h2>
      <p>
        We keep account data for as long as your account is active. You can
        remove tracked wallets at any time, and you can request deletion of your
        account and associated data by contacting us.
      </p>

      <h2>Disclaimer</h2>
      <p>
        <strong>Information only, not financial advice.</strong> See our{" "}
        <a href="/terms">Terms of Service</a> for the full picture.
      </p>
    </Prose>
  );
}
