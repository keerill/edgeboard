# EdgeBoard

Read-only analytics dashboard for Polymarket prediction markets. See `docs/instruction.md` for the full spec and `docs/PROGRESS.md` for build status.

> **Information only, not financial advice.** EdgeBoard never places bets/orders, custodies funds, or holds private keys.

## Stack (Phase 1)

- **Next.js** (App Router) + **TypeScript** (`strict`)
- **SCSS Modules** (Sass) — global tokens in `app/globals.scss`, component styles in co-located `*.module.scss`
- **PostgreSQL** + **Prisma** (ORM)
- **Auth.js (NextAuth v5)** — Google OAuth + email magic link (Resend)

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local` (see [Environment variables](#environment-variables)). At minimum you need `DATABASE_URL` and `NEXTAUTH_SECRET` to boot. Generate a secret with:

```bash
openssl rand -base64 32
```

### 3. Start Postgres

A local Postgres is provided via Docker Compose (matches the `DATABASE_URL` in `.env.example`):

```bash
docker compose up -d
```

### 4. Apply migrations

```bash
npm run db:migrate   # prisma migrate dev — creates/applies migrations
```

Inspect the database with `npm run db:studio`.

### 5. Run the app

```bash
npm run dev          # http://localhost:3000
```

## Environment variables

All secrets come from environment variables — never hardcode them. `.env.example` lists every variable with empty values; copy it to `.env.local` and fill in real values there (git-ignored).

| Variable | Required for | Notes |
|----------|--------------|-------|
| `DATABASE_URL` | everything | Postgres connection string (local Docker by default; Neon/Supabase in prod). |
| `NEXTAUTH_SECRET` | auth | Session/JWT signing secret. |
| `NEXTAUTH_URL` | auth (local) | e.g. `http://localhost:3000`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in | From Google Cloud Console. Redirect URI: `<origin>/api/auth/callback/google`. |
| `RESEND_API_KEY` | magic-link sign-in | From [resend.com](https://resend.com). |
| `EMAIL_FROM` | magic-link sign-in | Verified sender, e.g. `auth@yourdomain.com`. |

`EMAIL_SERVER`, the Polymarket API bases, Stripe, cron, Sentry and analytics vars are listed in `.env.example` for continuity but are wired in later phases.

> You can run the app and apply migrations with just `DATABASE_URL` + `NEXTAUTH_SECRET`. Google/Resend credentials are only needed to actually complete a sign-in.

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel.
2. Provision a production Postgres (Neon or Supabase) and set `DATABASE_URL` in Vercel project env.
3. Set the remaining env vars in Vercel (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`/origin, `GOOGLE_*`, `RESEND_API_KEY`, `EMAIL_FROM`).
4. Add each provider's production redirect URI (e.g. `https://<your-domain>/api/auth/callback/google`).
5. Apply migrations against the production DB once: `npm run db:deploy` (runs `prisma migrate deploy`).

The `build` script runs `prisma generate && next build`, so the Prisma client is regenerated on every Vercel build.

## Project structure

```
app/(marketing)   landing, terms, privacy
app/(app)         dashboard, markets, markets/[id], whales, settings (auth-gated)
app/api/auth      NextAuth route handler
app/api/cron      background jobs (placeholders until Phase 2+)
app/api/stripe    Stripe webhook (placeholder until Phase 5)
auth.ts           Auth.js config (Node runtime, Prisma adapter)
auth.config.ts    edge-safe Auth.js config (used by middleware)
middleware.ts     route protection
prisma/           schema + migrations
lib/db            Prisma client singleton
lib/polymarket    Polymarket API clients (Phase 2+)
lib/analytics     P&L / whale calculations (Phase 3+)
components/       shared UI
jobs/             ingestion logic (Phase 2+)
```
