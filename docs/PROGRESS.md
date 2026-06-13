# EdgeBoard — Progress

Статусы: `не начато` · `в работе` · `готово`
Источник истины по объёму работ — [instruction.md](instruction.md) (§12).

| Фаза | Название | Статус |
|------|----------|--------|
| 1 | Скелет | готово |
| 2 | Ingestion рынков и цен | не начато |
| 3 | Сделки и киты | не начато |
| 4 | Портфель | не начато |
| 5 | Монетизация | не начато |
| 6 | Полировка и запуск | не начато |
| 7 (v1.1) | Оповещения | не начато |

## Фаза 1 — Скелет — `готово`
Next.js (App Router) + TS `strict` + SCSS Modules, Prisma + Postgres, Auth.js v5 (Google OAuth + email magic link через Resend), пустые роуты по структуре §4, deploy-ready для Vercel.

Сделано:
- Скелет проекта (package.json, tsconfig strict, next/postcss/eslint config, .gitignore).
- Prisma-схема с таблицами Фазы 1: `users`, `accounts`, `sessions`, `verification_tokens`, `subscriptions` (enum `plan` free|pro). Миграция `init` применена.
- Auth.js v5 split-config (`auth.config.ts` edge-safe + `auth.ts` с Prisma-адаптером); хук `events.createUser` создаёт `subscription` с `plan=free` при первом входе (§9).
- `middleware.ts` защищает `/dashboard|/markets|/whales|/settings` (редирект на `/signin`).
- Роуты-заглушки: `(marketing)` (лендинг, terms, privacy с дисклеймером), `(app)` (dashboard, markets, markets/[id], whales, settings), `/signin`, `/api/cron/health`, `/api/stripe/webhook`.
- Локальный Postgres через `docker-compose.yml`; `.env.example` со всеми переменными §11 (пустые значения).

Проверено локально (DoD):
- Миграции применяются: `prisma migrate dev` → 5 таблиц в БД. ✅
- Сборка под Vercel-командой `prisma generate && next build` проходит при `strict`. ✅
- Защита роутов: `/dashboard` без сессии → 307 на `/signin`. ✅

Ожидает секретов пользователя:
- Реальный вход (DoD «зарегистрироваться/войти»): нужны `GOOGLE_CLIENT_ID/SECRET` и/или `RESEND_API_KEY` + `EMAIL_FROM` (верифицированный домен).
- Деплой на Vercel (DoD «задеплоено»): импорт репо в Vercel, прод-`DATABASE_URL` (Neon/Supabase), env-переменные, `prisma migrate deploy`.

## Фаза 2 — Ingestion рынков и цен — `не начато`
Клиенты Gamma/CLOB; cron `sync-markets` и `snapshot-prices`; таблицы `markets`, `price_snapshots`.
DoD: в БД появляются рынки и снимки цен; `/markets` показывает живые данные.

## Фаза 3 — Сделки и киты — `не начато`
Cron `sync-trades` + `aggregate-whales`; страница `/markets/[id]` с графиком и маркерами; страница `/whales`.
DoD: лента китов и график с крупными сделками работают на реальных данных.

## Фаза 4 — Портфель — `не начато`
Data API `/positions` (+ `/value`); `/dashboard` с P&L, винрейтом, позициями; `tracked_wallets`.
DoD: по введённому адресу корректно считается и показывается P&L и позиции.

## Фаза 5 — Монетизация — `не начато`
Stripe Checkout + Billing Portal + webhook; гейтинг Free/Pro.
DoD: подписка оформляется и отменяется; Pro-фичи открываются только платящим.

## Фаза 6 — Полировка и запуск — `не начато`
Лендинг, Terms/Privacy, дисклеймер, Sentry, аналитика, публичный мини-дашборд «whale moves» как контент.
DoD: лендинг конвертит в регистрацию; ошибки логируются; есть публичная страница для маркетинга.

## Фаза 7 (v1.1) — Оповещения — `не начато`
Алерты по китам/движению цены через email/Telegram.
DoD: пользователь создаёт алерт и получает уведомление.
