# EdgeBoard — Progress

Статусы: `не начато` · `в работе` · `готово`
Источник истины по объёму работ — [instruction.md](instruction.md) (§12).

| Фаза | Название | Статус |
|------|----------|--------|
| 1 | Скелет | готово |
| 2 | Ingestion рынков и цен | готово |
| 3 | Сделки и киты | готово |
| 4 | Портфель | готово |
| 5 | Монетизация | готово |
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

## Фаза 3 — Сделки и киты — `готово`
Cron `sync-trades` + `aggregate-whales`; таблицы `trades`, `whale_wallets`; страница `/markets/[id]` (график + маркеры китов + лента крупных сделок); страница `/whales` (лента + рейтинг).

Сделано:
- Prisma-модели `trades` и `whale_wallets` (§6); денежные/ценовые поля — `Decimal`. У `trades` добавлены `asset` (outcome-токен, для FIFO P&L) и `outcome` (ярлык для UI), а также `dedupe_key` (`@unique`) для идемпотентного upsert (§7). Миграции `add_trades_whale_wallets` + `add_trade_asset_outcome` применены.
- Клиент Data API (`lib/polymarket/data.ts`): `getWhaleTrades(conditionId, minUsdc)` — `GET /trades?market=…&filterType=CASH&filterAmount=…&takerOnly=true` (фильтр по USDC-номиналу на стороне API). Реюз обёртки `fetchJson` (retry/backoff/TTL-кеш). Тип `DataTrade` — loose, как `GammaMarket`. Контракт сверен с docs.polymarket.com.
- `lib/analytics/` — чистые тестируемые функции (§0.5): `isWhale` (определение кита, граница `>=`), `aggregateByWallet` (объём + last-active), `computePnl` (FIFO realized P&L + win-rate per `asset`). Тесты на Vitest: `whales.test.ts`, `pnl.test.ts` (11 кейсов).
- `jobs/sync-trades.ts` — топ-50 рынков по объёму, конкурентность 4; `sizeUsdc = usdcSize ?? size*price` (на живых данных `usdcSize` отсутствует → используется `size*price`); `createMany({skipDuplicates})` по `dedupe_key`. `jobs/aggregate-whales.ts` — пересчёт `whale_wallets` из китовых сделок.
- Роуты `/api/cron/sync-trades` и `/api/cron/aggregate-whales` (та же защита `CRON_SECRET`, `dynamic`/`maxDuration`). В `vercel.json` добавлены расписания (3 мин / час).
- UI: `/markets/[id]` — серверный компонент (график `PriceChart` на Recharts: линия YES из `price_snapshots` + маркеры китов `ReferenceDot` по сторонам buy/sell; таблица последних крупных сделок). `/whales` — лента топ-сделок (24ч/7д, фильтр по категории) + рейтинг китов по объёму. Компоненты `PriceChart` (client), `TradesTable` (server). Форматтеры `shortenAddress`, `formatRelativeTime`, `formatPercent` + знак у `formatCompactUsd`.

Решение по P&L/win-rate (для прозрачности): считаются FIFO только по **ингестированным китовым сделкам**, поэтому это оценка снизу (мелкие закрывающие сделки кошелька не тянем). Рейтинг `/whales` поэтому сортируется по объёму (надёжная метрика), а P&L/win-rate помечены как «Est.» с дисклеймером. Продвинутый скоринг китов отложен (§15).

Проверено локально (DoD):
- Миграции применяются: `prisma migrate dev` → таблицы `trades`, `whale_wallets`. ✅
- `npm run typecheck` (strict), `npm run lint`, `npm run build`, `npm test` (11/11) проходят. ✅
- Контракт Data API сверен на живых данных: для топ-рынков возвращаются китовые сделки нужной формы (`proxyWallet`/`side`/`asset`/`size`/`price`/`timestamp`/`outcome`/`transactionHash`); `usdcSize` отсутствует → `size*price`. ✅
- Авторизация cron: без секрета → `401`; с `Authorization: Bearer` → `200`. ✅
- `sync-trades` → `{ok:true, created:137, skipped:0}`; `aggregate-whales` → `{ok:true, wallets:74}`; 137 distinct `dedupe_key` == 137 строк (без дублей, идемпотентно). ✅ (живые данные Polymarket)

Ожидает действий пользователя:
- Заполнить `CRON_SECRET` в `.env` (как и в Фазе 2), чтобы дёргать новые cron локально/на Vercel. `DATA_API_BASE` и `WHALE_THRESHOLD_USDC` уже есть в `.env.example` (новых переменных Фаза 3 не вводит).
- Визуальная проверка под авторизацией: войти, открыть `/whales` (лента + рейтинг, переключатель 24ч/7д) и `/markets/[id]` (график с маркерами китов + таблица крупных сделок). Для наполнения БД дёрнуть `sync-trades`, затем `aggregate-whales`.
- На Vercel под-суточные расписания (`sync-trades` */3) требуют платного плана.

## Фаза 4 — Портфель — `готово`
Data API `/positions` (+ `/value`); таблица `tracked_wallets`; страница `/dashboard` с вводом/выбором публичного адреса, сводкой (total value, P&L cash/%, win rate, число позиций) и таблицей позиций.

Сделано:
- Prisma-модель `tracked_wallets` (§6): `id`, `user_id` (fk→users, `onDelete: Cascade`), `address` (хранится в lowercase), `label?`, `created_at`; `@@unique([userId, address])` (нет дублей кошелька у юзера) + `@@index([userId])`. Связь `User.trackedWallets`. Миграция `add_tracked_wallets` применена (аддитивная, без потери данных).
- Клиент Data API (`lib/polymarket/data.ts`): `getPositions(address)` — `GET /positions?user=…&sortBy=CURRENT&sortDirection=DESC&limit=500`; `getPortfolioValue(address)` — `GET /value?user=…` (форма `[{user,value}]`, парсится в число). Оба реюзят обёртку `fetchJson` (retry/backoff/TTL-кеш 60с) и деградируют мягко (`[]` / `null` при сбое — как `getWhaleTrades`). Типы `DataPosition`/`DataValue` — loose. Контракт сверен на живых данных. **Важно:** Data-API параметр кошелька — `user` (не `wallet`); `percentPnl` приходит в процентах (6.12 = 6.12%), поэтому % считаем сами из `cashPnl/initialValue`.
- `lib/analytics/portfolio.ts` — чистые тестируемые функции (§0.5): `summarizePortfolio(positions)` (сумма value/cost basis/cashPnl, total % = cashPnl/costBasis, win rate = доля позиций в плюсе) и `isValidWalletAddress` (regex `0x` + 40 hex). Тесты на Vitest: `portfolio.test.ts` (10 кейсов) → всего 21/21.
- Auth.js: добавлен `session`-callback (edge-safe) `token.sub → session.user.id`, чтобы серверные компоненты/actions скоупили данные по пользователю (нужно и для Фазы 5).
- Server actions (`app/(app)/dashboard/actions.ts`, `"use server"`): `addTrackedWallet` (валидация адреса, lowercase, тихий дедуп по P2002, `revalidatePath` + редирект на `?wallet=`), `removeTrackedWallet` (`deleteMany` со скоупом `userId` — нельзя удалить чужой). Невалидный адрес → `?error=invalid-address`.
- UI: `/dashboard` (серверный компонент, `force-dynamic`) — селектор кошельков (чипы-ссылки `?wallet=`), форма добавления, кнопка удаления; сводные карточки `PortfolioSummary`; таблица `PositionsTable` (рынок со ссылкой на наш `/markets/[id]` если рынок закэширован, исход, размер, средняя цена входа, текущая цена, P&L $ и %). Цвета +/− (зелёный/красный). Форматтер `formatShares` добавлен в `lib/format.ts`. Пустое состояние (нет кошельков / нет позиций / API недоступен) обрабатывается.

Решение по P&L (для прозрачности): на дашборде P&L берётся напрямую из Data API `/positions` (`cashPnl`/`currentValue`/`initialValue`) — это авторитетный cost-basis Polymarket, в отличие от оценочного FIFO `computePnl` Фазы 3 (он только по китовым сделкам). Total value = `/value` если доступен (может включать кэш-баланс), иначе сумма `currentValue`. Win rate = доля позиций, которые сейчас в плюсе.

Проверено локально (DoD):
- Миграция применяется: `prisma migrate dev` → таблица `tracked_wallets`. ✅
- `npm run typecheck` (strict), `npm run lint`, `npm run build`, `npm test` (21/21) проходят. ✅
- Контракт Data API сверен на живых данных: `/positions` отдаёт `size/avgPrice/curPrice/initialValue/currentValue/cashPnl/percentPnl/title/outcome/conditionId/redeemable`; `/value` → `[{user,value}]`. ✅
- Интеграционная проверка расчёта на живом адресе: `/value` (headline) ≈ сумма `currentValue`; per-position P&L = `currentValue − initialValue`; сводка считается корректно. ✅ (живые данные Polymarket)

Ожидает действий пользователя:
- Новых env-переменных нет (`DATA_API_BASE` уже в `.env.example` с дефолтом). Для входа на защищённый `/dashboard` нужны креды Фазы 1 (Google/Resend).
- Визуальная проверка под авторизацией: войти → `/dashboard` → добавить публичный адрес (например, кошелёк из рейтинга `/whales`) → увидеть сводку и таблицу позиций; переключить/удалить кошелёк.
- Гейтинг Free/Pro по числу кошельков (Free=1) сознательно отложен на Фазу 5 (монетизация) — сейчас можно добавлять несколько кошельков. График стоимости портфеля во времени (§8, опционально «если есть данные») отложен: нет источника таймсерии портфеля (отдельный cron вне рамок Фазы 4).

## Фаза 5 — Монетизация — `готово`
Stripe Checkout + Billing Portal + webhook; гейтинг Free/Pro по плану из `Subscription.plan`.

Сделано:
- Зависимость `stripe` (v22, API `2026-05-27.dahlia`); ленивый синглтон `lib/stripe/client.ts` (`getStripe()`, читает `STRIPE_SECRET_KEY`, бросает если не задан; `apiVersion` не пинуем — берём из SDK). Миграция БД не нужна — модель `Subscription` (§6) уже содержит все поля (`stripeCustomerId`, `stripeSubscriptionId`, `plan`, `status`, `currentPeriodEnd`).
- `lib/plan.ts` — чистая, тестируемая логика лимитов (§10): `PLAN_LIMITS` (free/pro: `trackedWallets`, `historyDays`, `whaleFeedLimit`, `whaleRanking`, `alerts`), `isPro`, `canAddWallet`, `historyCutoff`. Тесты на Vitest: `lib/plan.test.ts` (6 кейсов) → всего 27/27. `lib/subscription.ts` — IO-хелперы (`getUserSubscription`, `getCurrentPlan` — fail-closed в `free`).
- Серверные actions (`app/(app)/settings/actions.ts`, `"use server"`): `createCheckoutSession` (reuse/создание Stripe customer с `metadata.userId`, hosted Checkout `mode=subscription`, `client_reference_id`+`subscription_data.metadata`, redirect на `session.url`); `createBillingPortalSession` (Billing Portal по `stripeCustomerId`). Base URL из заголовка `host` (fallback `NEXTAUTH_URL`) — новых env нет. Используем серверный redirect на хостед-страницы Stripe, без client-side Stripe.js (поэтому `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` в MVP не используется).
- Вебхук `/api/stripe/webhook` (`runtime=nodejs`, `force-dynamic`): сырое тело + `stripe.webhooks.constructEvent` (невалидная подпись → `400`). Обрабатывает `checkout.session.completed` (retrieve подписки → `plan=pro`), `customer.subscription.updated|deleted` (статус → план: `active|trialing|past_due`=pro, иначе free). Идемпотентно: `updateMany` по `metadata.userId` с fallback на `stripeCustomerId`; `current_period_end` берём из `subscription.items.data[0]` (в текущем API его нет на верхнем уровне).
- Гейтинг Free/Pro (§10): **кошельки** — `addTrackedWallet` блокирует 2-й кошелёк на Free (`canAddWallet`), на дашборде вместо формы — апселл; повторное добавление уже отслеживаемого адреса просто выбирает его (без проверки лимита). **История цены** `/markets/[id]` — на Free фильтр `ts >= now-7d` + примечание с апселлом, Pro — полная история. **Лента китов** `/whales` — `take = whaleFeedLimit` (Free 15 / Pro 50), рейтинг «Top whales» скрыт на Free и заменён апселлом. **Settings** показывает текущий план, статус, дату продления/окончания, лимиты (исп. кошельков), и кнопку Upgrade (Checkout) / Manage (Portal); баннер по `?status=success|cancel`.

Проверено локально (DoD — статика, без секретов):
- `npm run typecheck` (strict), `npm run lint`, `npm run build`, `npm test` (27/27) проходят. ✅
- Build: `/api/stripe/webhook`, `/settings`, `/dashboard`, `/markets/[id]`, `/whales` — динамические (ƒ). ✅

Ожидает действий пользователя (e2e-проверка DoD требует тестовых ключей Stripe):
- Заполнить в `.env.local`: `STRIPE_SECRET_KEY` (`sk_test_…`), `STRIPE_PRICE_ID_PRO` (`price_…` рекуррентной цены ~€15/мес — создать в Stripe), `STRIPE_WEBHOOK_SECRET` (`whsec_…` из `stripe listen --forward-to localhost:3000/api/stripe/webhook`). `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — опционально (в MVP не используется). Убедиться, что задан `NEXTAUTH_URL`.
- Прогон: войти → `/settings` (Free) → **Upgrade to Pro** → тестовая карта `4242 4242 4242 4242` → возврат с баннером → вебхук `checkout.session.completed` → план **Pro**. Проверить разблокировку: 2-й кошелёк на `/dashboard`, полная история на `/markets/[id]`, длинная лента + рейтинг на `/whales`. Затем **Manage subscription** → Billing Portal → отмена → `customer.subscription.deleted` → план **Free**, Pro-фичи снова закрыты. ✅ DoD.
- На Vercel: добавить endpoint вебхука в Stripe Dashboard, его signing secret → `STRIPE_WEBHOOK_SECRET` в env проекта.

## Фаза 6 — Полировка и запуск — `не начато`
Лендинг, Terms/Privacy, дисклеймер, Sentry, аналитика, публичный мини-дашборд «whale moves» как контент.
DoD: лендинг конвертит в регистрацию; ошибки логируются; есть публичная страница для маркетинга.

## Фаза 7 (v1.1) — Оповещения — `не начато`
Алерты по китам/движению цены через email/Telegram.
DoD: пользователь создаёт алерт и получает уведомление.
