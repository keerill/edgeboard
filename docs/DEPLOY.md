# EdgeBoard — Deployment runbook (Vercel)

Ordered, repo-specific steps to take EdgeBoard from local to a live Vercel
deployment via the **GitHub + Vercel UI** path. Do the steps top to bottom — each
later service needs the production URL or keys from an earlier one.

> Secrets never go in git. The repo keeps only `.env.example` (empty). Put real
> values into **Vercel → Project → Settings → Environment Variables**. Two values
> are pre-generated for you (see "Generated secrets" at the bottom).

Legend: **(req)** required to boot/sign in · **(opt)** feature is a no-op until set.

---

## 0. Accounts you'll need (none exist yet)

Create these (free tiers are fine to start):
- **GitHub** — host the repo.
- **Vercel** — hosting (sign in with GitHub).
- **Neon** (or Supabase) — Postgres → `DATABASE_URL`.
- **Google Cloud** — OAuth client → `GOOGLE_CLIENT_ID/SECRET`.
- **Resend** + a domain you control — email magic link & alerts → `RESEND_API_KEY`, `EMAIL_FROM`.
- **Stripe** — subscriptions → `STRIPE_*`.
- *(optional)* Sentry, PostHog, Telegram bot.

---

## 1. Push the repo to GitHub

The repo is committed locally but has no remote. Create an **empty** repo on
GitHub (no README), then:

```bash
git remote add origin https://github.com/<you>/edgeboard.git
git push -u origin main
```

---

## 2. Provision Postgres (Neon)

1. Neon → create project → copy the **pooled** connection string.
2. It becomes `DATABASE_URL` (must include `?sslmode=require`). Example:
   `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/edgeboard?sslmode=require`

> Migrations are **not** run by the build. After the first deploy, apply them
> once (Step 7).

---

## 3. Import the project into Vercel

1. Vercel → **Add New → Project** → import the GitHub repo.
2. Framework preset: **Next.js** (auto). Build command stays `prisma generate && next build` (from `package.json`).
3. Before the first deploy, add the env vars below (Step 4+). You can deploy, add
   vars, then **redeploy** — env changes need a redeploy to take effect.

---

## 4. Core env vars (req)

Set these in Vercel for **Production** (and Preview if you use it):

| Var | Value |
|-----|-------|
| `DATABASE_URL` | from Step 2 |
| `NEXTAUTH_SECRET` | generated (bottom of this doc) |
| `NEXTAUTH_URL` | your prod URL, e.g. `https://edgeboard.vercel.app` (set after you know the domain) |

The API bases have safe defaults baked in, but you can set them explicitly:
`GAMMA_API_BASE`, `CLOB_API_BASE`, `DATA_API_BASE` (see `.env.example`).

---

## 5. Google OAuth (req for Google sign-in)

1. Google Cloud → **APIs & Services → Credentials → Create OAuth client ID → Web application**.
2. **Authorized redirect URI:** `https://<your-domain>/api/auth/callback/google`
   (add the localhost one too for local dev: `http://localhost:3000/api/auth/callback/google`).
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel.

---

## 6. Resend email (req for magic-link sign-in; also powers email alerts)

1. Resend → **add & verify your domain** (DNS records). Sender must be on that domain.
2. Create an API key.
3. Set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `auth@yourdomain.com`) in Vercel.

This single Resend setup covers both the Auth.js magic link **and** Phase 7 email alerts.

---

## 7. Apply database migrations

The build doesn't migrate. Run once against the prod DB, either:

**A) locally (simplest):**
```bash
DATABASE_URL="<prod url from Step 2>" npx prisma migrate deploy
```

**B) or make it automatic:** change the Vercel build command to
`prisma generate && prisma migrate deploy && next build`.

Verify: the prod DB now has `users`, `subscriptions`, `markets`, `price_snapshots`,
`trades`, `whale_wallets`, `tracked_wallets`, `alerts` (+ Auth.js tables).

> ✅ **Phase 1 DoD** is met once you can sign in (Google/email) on the live URL and migrations are applied.

---

## 8. Stripe (Phase 5)

1. Stripe → create a **Product "Pro"** with a **recurring price ~€15/mo** → copy its `price_…` → `STRIPE_PRICE_ID_PRO`.
2. Copy your secret key → `STRIPE_SECRET_KEY` (use `sk_test_…` to test, `sk_live_…` for real).
3. **Webhook:** Stripe → Developers → Webhooks → **Add endpoint**
   `https://<your-domain>/api/stripe/webhook`, events:
   `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
   Copy the endpoint's **signing secret** → `STRIPE_WEBHOOK_SECRET`.
4. Enable the **Billing Portal** in Stripe settings (so "Manage subscription" works).
5. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — not used in MVP (server-side hosted checkout), leave empty.

Redeploy after setting these.

> ✅ **Phase 5 DoD:** upgrade with test card `4242 4242 4242 4242` → webhook flips plan to Pro → Pro features unlock; cancel in Portal → back to Free.

---

## 9. Background jobs / cron (Phases 2–3, 6, 7)

1. Set `CRON_SECRET` (generated below) and `WHALE_THRESHOLD_USDC=5000` in Vercel.
2. ⚠️ **Vercel Hobby allows cron at most once/day (and ≤2 jobs).** Our ingestion
   needs sub-daily runs, so `vercel.json` ships with **`"crons": []`** (no native
   crons) — that's why the deploy passes on the free plan. The endpoints still
   exist and are protected by `CRON_SECRET`; you just trigger them yourself.

Pick how to drive ingestion:

**A) Manual seed (quickest, to verify):**
```bash
curl "https://<your-domain>/api/cron/sync-markets?secret=$CRON_SECRET"
curl "https://<your-domain>/api/cron/snapshot-prices?secret=$CRON_SECRET"
curl "https://<your-domain>/api/cron/sync-trades?secret=$CRON_SECRET"
curl "https://<your-domain>/api/cron/aggregate-whales?secret=$CRON_SECRET"
curl "https://<your-domain>/api/cron/check-alerts?secret=$CRON_SECRET"
```

**B) Free automation — GitHub Actions** (scheduled workflow hitting the endpoints;
min interval 5 min, no Vercel upgrade needed). Ask me to add `.github/workflows/cron.yml`;
you then add repo secrets `CRON_BASE_URL` (your prod URL) and `CRON_SECRET`.

**C) Free automation — external pinger** like cron-job.org pointing at each endpoint
with header `Authorization: Bearer <CRON_SECRET>`.

**D) Upgrade to Vercel Pro** → restore native crons by putting this back in `vercel.json`:
```json
{ "crons": [
  { "path": "/api/cron/sync-markets",    "schedule": "*/15 * * * *" },
  { "path": "/api/cron/snapshot-prices", "schedule": "*/10 * * * *" },
  { "path": "/api/cron/sync-trades",     "schedule": "*/3 * * * *" },
  { "path": "/api/cron/aggregate-whales","schedule": "0 * * * *" },
  { "path": "/api/cron/check-alerts",    "schedule": "*/5 * * * *" }
] }
```

> ✅ **Phases 2–3 DoD:** after seeding (A/B/C), `/markets`, `/markets/[id]`, and `/whales` show live data.

---

## 10. Optional integrations (opt)

- **Sentry:** `SENTRY_DSN` (+ `NEXT_PUBLIC_SENTRY_DSN`); for source maps add `SENTRY_ORG/PROJECT/AUTH_TOKEN`.
- **PostHog:** `NEXT_PUBLIC_POSTHOG_KEY` (+ `NEXT_PUBLIC_POSTHOG_HOST`, default US).
- **Telegram alerts (Phase 7):** create a bot via **@BotFather** → `TELEGRAM_BOT_TOKEN`. Each user saves their numeric chat ID in `/settings`.

All three are clean no-ops until set — the app builds and runs without them.

---

## 11. Final verification (per-phase DoD)

1. **Auth** — sign in via Google and via email magic link on the live URL.
2. **Markets/Whales** — seed cron (Step 9) → live cards, market chart with whale markers, whale feed.
3. **Portfolio** — `/dashboard` → add a public wallet → P&L + positions.
4. **Billing** — `/settings` → upgrade (test card) → Pro unlocks → cancel → Free.
5. **Alerts** — Pro → create a `whale_move` email alert → seed `sync-trades` →
   `curl ".../api/cron/check-alerts?secret=$CRON_SECRET"` → email arrives, response `{ ok:true, sent:N }`.
6. **Marketing** — `/`, `/terms`, `/privacy`, `/whale-watch` load; disclaimer present.

---

## Generated secrets

These two are random strings (not tied to any account) — paste into Vercel env.
Rotate any time by regenerating (`openssl rand -base64 32` / `openssl rand -hex 32`).
The actual values were provided in chat (kept out of git on purpose).

- `NEXTAUTH_SECRET` — see chat
- `CRON_SECRET` — see chat
