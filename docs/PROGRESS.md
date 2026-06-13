# EdgeBoard — Progress

Статусы: `не начато` · `в работе` · `готово`
Источник истины по объёму работ — [instruction.md](instruction.md) (§12).

| Фаза | Название | Статус |
|------|----------|--------|
| 1 | Скелет | готово |
| 2 | Ingestion рынков и цен | готово |
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

## Фаза 2 — Ingestion рынков и цен — `готово`
Клиенты Gamma/CLOB; cron `sync-markets` и `snapshot-prices`; таблицы `markets`, `price_snapshots`; страница `/markets` на живых данных.

Сделано:
- Prisma-модели `markets` и `price_snapshots` (§6), денежные/ценовые поля — `Decimal` (Postgres `numeric`, не float). Миграция `add_markets_price_snapshots` применена.
- `lib/polymarket/`: обёртка над `fetch` (`http.ts`) с таймаутом, retry + exponential backoff на 429/5xx (учёт `Retry-After`) и опциональным TTL-кешем; клиент Gamma (`getActiveMarkets`, пагинация, сортировка по объёму); клиент CLOB (`getMidpoint`). База URL берётся из env с дефолтом, парсер `parseJsonArray` устойчив к JSON-строкам и массивам (`clobTokenIds`/`outcomePrices`).
- `jobs/sync-markets.ts` — upsert активных рынков из Gamma по `condition_id` (топ-200 по объёму) + сидинг одного YES-снимка цены из `outcomePrices`. `jobs/snapshot-prices.ts` — CLOB midpoint по YES-токену для топ-50 рынков, конкурентность 4.
- Роуты `/api/cron/sync-markets` и `/api/cron/snapshot-prices`, защищены `CRON_SECRET` (`lib/cron.ts`: `Authorization: Bearer`, `x-cron-secret`, либо `?secret=`; fail-closed если секрет не задан). `vercel.json` с расписаниями (15/10 мин).
- `/markets` — серверный компонент на данных из БД: карточки (вопрос, YES-цена, объём, ликвидность), поиск по вопросу, сортировка (объём/ликвидность), фильтр по категории (best-effort), пустое состояние. Компонент `components/MarketCard`, форматтеры `lib/format.ts`.

Решение по источнику цены (для прозрачности): `price_snapshots` — это таймсерия YES-цены из двух источников: грубый сидинг из Gamma `outcomePrices` на каждом `sync-markets` (гарантирует цену на `/markets` сразу после первого синка) + более частые CLOB-midpoint снимки по топ-N. Midpoint выбран как «текущая цена» — не требует выбора стороны BUY/SELL.

Проверено локально (DoD):
- Миграция применяется: `prisma migrate dev` → таблицы `markets`, `price_snapshots`. ✅
- `npm run typecheck` (strict) и `npm run build` проходят. ✅
- Авторизация cron: без секрета → `401`; с `Authorization: Bearer` → `200`. ✅
- `sync-markets` → `{ok:true, synced:200, snapshots:200}`; `snapshot-prices` → `{ok:true, snapshots:50, skipped:0}`. ✅
- В БД: `markets`=200, `price_snapshots`=250 (200 Gamma + 50 CLOB), у всех 200 рынков есть YES-цена. ✅ (живые данные Polymarket)

Ожидает действий пользователя:
- Заполнить `CRON_SECRET` в `.env` (любой непустой секрет), чтобы дёргать cron локально/на Vercel.
- `/markets` под авторизацией: войти и открыть страницу (проверить живые карточки). Для наполнения БД дёрнуть оба cron-эндпоинта.
- На Vercel: расписания крона из `vercel.json` подхватятся автоматически; Vercel сам шлёт `Authorization: Bearer $CRON_SECRET`. Под-суточные расписания требуют платного плана.

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
