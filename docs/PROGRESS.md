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
| 6 | Полировка и запуск | готово |
| 7 (v1.1) | Оповещения | готово |

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

## Фаза 6 — Полировка и запуск — `готово`
Лендинг, Terms/Privacy, дисклеймер, Sentry, аналитика, публичный мини-дашборд «whale moves» как контент.

Сделано:
- **Лендинг** ([app/(marketing)/page.tsx](../app/(marketing)/page.tsx)) — серверный компонент по §14: hero с двумя CTA (Sign up → `/signin`, See live whale moves → `/whale-watch`), 4 фич-карточки (Whale moves · Price history with big trades · Portfolio P&L · Alerts «Soon»), блок цены Free/Pro (числа берутся из `PLAN_LIMITS`, чтобы не расходились с реальным гейтингом), финальный CTA-баннер. В шапке маркетинг-лейаута ссылка «Whale watch».
- **Terms/Privacy** — расширены поверх компонента `Prose` (добавлены стили `h2`/`ul`/`a`/`small`): честная формулировка «read-only, не финсовет, без ставок/кастоди/ключей», обработчики (Stripe/email/hosting/observability), хранимые данные, дата «Last updated: 13 June 2026», `metadata` на каждой странице. Дисклеймер «Information only, not financial advice» — в футере (все marketing-страницы), на `/signin`, на `/whale-watch` и в Terms/Privacy.
- **Публичный мини-дашборд** ([app/(marketing)/whale-watch/page.tsx](../app/(marketing)/whale-watch/page.tsx)) → `/whale-watch`, без авторизации (не входит в `PROTECTED_PREFIXES`, вне `(app)`-лейаута), `force-dynamic`. Реюз тех же Prisma-запросов, что и `/whales` (топ-китовые сделки `isWhale` за 24ч/7д + топ-5 китов по объёму), без плана-гейтинга. Реюз `TradesTable`, форматтеров, `prisma`-синглтона. У `TradesTable` добавлен опциональный проп `linkMarkets` (по умолчанию `true`): на публичной странице `false` — рынок рендерится текстом, без ссылок на гейтнутый `/markets/[id]`. CTA «Sign up free».
- **Sentry** (`@sentry/nextjs` ^10): `instrumentation.ts` (`register` + `onRequestError`), `sentry.server.config.ts` / `sentry.edge.config.ts` (`dsn` из `SENTRY_DSN`), `instrumentation-client.ts` (`dsn` из `NEXT_PUBLIC_SENTRY_DSN` + `onRouterTransitionStart`), `app/global-error.tsx`. `next.config.ts` обёрнут в `withSentryConfig` (`silent`, source-map upload пропускается без `SENTRY_ORG/PROJECT/AUTH_TOKEN`). Всё env-гейтнуто: без DSN SDK — чистый no-op. Добавлены `app/error.tsx` и `app/not-found.tsx` (репорт в Sentry + UI).
- **Аналитика** (`posthog-js` ^1): `components/Analytics/PostHogProvider.tsx` (`"use client"`) — без `NEXT_PUBLIC_POSTHOG_KEY` рендерит только `children` (ноль аналитики); с ключом — `posthog.init` + SPA-`$pageview` по сменам роута через `usePathname`/`useSearchParams` в собственном `<Suspense>` (требование Next 15). Смонтирован в корневом `app/layout.tsx` (тот остаётся серверным компонентом). CTA-клики покрывает autocapture, поэтому лендинг — серверный.

Решение по env (для прозрачности): обе интеграции опциональны и не ломают сборку без секретов. `SENTRY_AUTH_TOKEN` — единственный реальный секрет (только для загрузки source-map в CI/Vercel); `NEXT_PUBLIC_POSTHOG_HOST` имеет дефолт `https://us.i.posthog.com` (не секрет, по аналогии с `GAMMA_API_BASE`).

Проверено локально (DoD — статика, без секретов):
- `npm run typecheck` (strict), `npm run lint`, `npm test` (27/27), `npm run build` проходят **без заданных Sentry/PostHog env** (Sentry no-op, PostHog рендерит children, `withSentryConfig` молча пропускает upload — 0 предупреждений). ✅
- Build: `/`, `/terms`, `/privacy`, `/_not-found` — статические (○); `/whale-watch` — динамический (ƒ). ✅
- Публичная страница: `/whale-watch` не входит в `PROTECTED_PREFIXES` (`startsWith`), middleware её не редиректит → доступна без входа. ✅

Ожидает действий пользователя (e2e и прод):
- Для живого логирования ошибок: заполнить `SENTRY_DSN` (+ `NEXT_PUBLIC_SENTRY_DSN` для клиента); для source-map — `SENTRY_ORG/PROJECT/AUTH_TOKEN` в env Vercel/CI. Бросить тестовую ошибку → проверить событие в Sentry.
- Для аналитики: заполнить `NEXT_PUBLIC_POSTHOG_KEY` (хост по умолчанию us; для EU — `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`) → проверить `$pageview`/autocapture в PostHog.
- Наполнить `/whale-watch` данными: дёрнуть cron `sync-trades`, затем `aggregate-whales` (как в Фазе 3). Без секретов Sentry/PostHog приложение работает штатно.
- Новой миграции БД в этой фазе нет.

## Фаза 7 (v1.1) — Оповещения — `готово`
Алерты по китам/движению цены/резолву рынка через email + Telegram; Pro-фича; создание в `/settings`; cron-эвалюация.

Сделано:
- Prisma-модель `Alert` (§6) + enum'ы `AlertType` (`whale_move`|`price_swing`|`market`) и `AlertChannel` (`email`|`telegram`); поле `User.telegramChatId`; связи `User.alerts`/`Market.alerts`. Денежные поля — `Decimal`. `lastFiredAt` — watermark для дедупа/кулдауна. Миграция `add_alerts` (аддитивная).
- **Каналы (оба, §3):** email через Resend (`lib/notify/email.ts`, ленивый синглтон как `lib/stripe/client.ts`; получатель — email аккаунта; reuse зависимости Resend из Фазы 1) и Telegram Bot API (`lib/notify/telegram.ts`, `sendMessage` через `fetch`; получатель — сохранённый `telegramChatId`). Диспетчер `lib/notify/index.ts` — мягко пропускает канал (без throw), если он не сконфигурирован или нет получателя; реальные ошибки отправки пробрасываются.
- **Чистая логика (§0.5)** `lib/alerts/evaluate.ts` (без Prisma/IO): `matchWhaleTrades` (скоуп market/wallet/min-USDC + watermark, reuse `isWhale`), `priceSwingPoints` (signed pp от начала окна к последнему снимку), `shouldFirePriceSwing` (порог + кулдаун), `shouldFireMarketAlert` (закрыт && ещё не стрелял), и билдеры сообщений `whale/priceSwing/market` (reuse `lib/format`). Тесты `lib/alerts/evaluate.test.ts` (15 кейсов) + `canAddAlert` в `lib/plan.test.ts` → всего 44/44.
- **Гейтинг (§10):** `lib/plan.ts` — `alertsLimit` (free `0`, pro `20`) + `canAddAlert`. Создание блокируется для Free (action), эвалюация грузит только алерты Pro-владельцев (`user.subscription.plan = pro` — fail-closed при даунгрейде), UI на Free показывает апселл.
- **Cron** `jobs/check-alerts.ts` → `/api/cron/check-alerts` (защита `CRON_SECRET`, `dynamic`/`maxDuration`, как `sync-trades`); per-alert try/catch; `lastFiredAt` двигается только при успешной отправке (пропуск из-за неконфигурированного канала → повтор в след. запуске). В `vercel.json` расписание `*/5`. Возвращает `{ ok, evaluated, matched, sent, skipped, failed }`.
- **UI** `/settings` — секция Alerts: для Pro форма создания (тип/канал/рынок/threshold/wallet, серверный рендер, валидация в action), список алертов с Pause/Resume и Delete, поле сохранения Telegram chat ID; для Free — апселл. Server actions `addAlert`/`removeAlert`/`toggleAlert`/`saveTelegramChatId` (скоуп по `userId`, паттерн `dashboard/actions.ts`, баннеры через `?status=`/`?error=`).

Решения (для прозрачности):
- Тип `market` в §6 размыт — реализован как **уведомление о закрытии/резолве рынка** (`markets.closed`, который ведёт `sync-markets`); отдельно от трейдо-/цено-зависимых типов и тестируемо.
- Схема: §6 даёт один полиморфный `target`; разбит на типизированные колонки `marketId` (FK) + `wallet` + `threshold` ради целостности и strict-запросов (как Фаза 3 добавляла `asset`/`outcome`/`dedupe_key`).
- `price_swing`: окно 24ч, метрика — signed pp от начала окна к последнему снимку; кулдаун 60 мин. Whale-порог алерта по умолчанию = `WHALE_THRESHOLD_USDC`.

Проверено локально (DoD — статика, без секретов; как в Фазах 5–6):
- `npm run typecheck` (strict), `npm run lint`, `npm test` (44/44), `npm run build` проходят без заданных Resend/Telegram секретов (каналы — no-op skip). ✅
- Миграция применяется: `prisma migrate dev` → таблица `alerts` + колонка `users.telegram_chat_id`. ✅
- Build: `/api/cron/check-alerts` — динамический роут (ƒ). ✅

Ожидает действий пользователя (e2e DoD требует ваших секретов):
- Новой env-переменной нет: email-алерты используют `RESEND_API_KEY` + `EMAIL_FROM` (Фаза 1), Telegram — `TELEGRAM_BOT_TOKEN` (уже в `.env.example`), ссылки — `NEXTAUTH_URL`, cron — `CRON_SECRET`.
- Прогон: сделать юзера Pro (Stripe-тест Фазы 5 или `subscriptions.plan='pro'` локально) → `/settings` → создать email-алерт `whale_move` («Any market») → дёрнуть `/api/cron/sync-trades?secret=$CRON_SECRET` (наполнить китовые сделки) → `/api/cron/check-alerts?secret=$CRON_SECRET` → при заданных `RESEND_API_KEY`/`EMAIL_FROM` приходит письмо, ответ `{ ok:true, matched:N, sent:N }`. ✅ DoD.
- Telegram (опц.): сохранить chat ID в `/settings`, задать `TELEGRAM_BOT_TOKEN`, повторить с каналом `telegram`. `price_swing`/`market` (опц.): создать алерты на рынок и дождаться пересечения порога/закрытия рынка.
- На Vercel: расписание `check-alerts` (*/5) подхватится из `vercel.json` (под-суточные крон требуют платного плана).

## Фаза 8 (v1.2) — Отзывчивость UI и устойчивость — `готово`
Повсеместная обратная связь на действия пользователя (фильтры/кнопки больше не «висят» молча), снижение реальной задержки фильтров и стилизованные состояния ошибок. Архитектура прежняя: серверные компоненты + `force-dynamic`, фильтры в URL, без клиентского data-fetching.

Сделано:
- **Примитивы.** `components/Spinner` (чистый CSS-ринг, варианты `inline`/`overlay`, `currentColor` внутри акцентных кнопок, no-spin при `prefers-reduced-motion`). `components/Filters/*` — `FilterProvider` (один общий `useTransition` + `startTransition` через контекст, безопасные дефолты), `FilterPills` (URL-сегмент-контрол: мгновенная подсветка через `useOptimistic`, навигация внутри транзишена), `PendingRegion` (затемняет регион `::after`-скримом + overlay-спиннер, не ломая flex/grid внутри), `SearchForm` (контролируемый поиск с прогрессивным no-JS фолбэком). `components/SubmitButton` (`useFormStatus`: `disabled`+спиннер+`pendingText`; idle-рендер структурно идентичен старой `<button>`).
- **Фильтры → мгновенный отклик.** `/whales` (period/category), `/markets` (sort/category + поиск), `/dashboard` (селектор кошельков) переведены с `<Link>`-чипов на `FilterPills`; затрагиваемые регионы обёрнуты в `PendingRegion`. Клик: пилюля активна сразу, регион затемняется со спиннером «Updating…», контент меняется по ответу сервера; `scroll:false`, работают back/forward. Дублированный SCSS чипов из whales/markets/dashboard схлопнут в `components/Filters/filters.module.scss`.
- **Формы → pending-состояния.** Все server-action кнопки (`add/remove wallet`, `Upgrade`/`Manage subscription`, `Create alert`, `Save telegram`) → `SubmitButton`. Серверные `redirect()` сохранены — `pending` держится весь раунд-трип, `disabled` гасит дабл-сабмит (важно для Stripe).
- **Optimistic.** `components/Alerts/AlertList` (`"use client"`, `useOptimistic`): pause/resume и delete применяются мгновенно, затем сверяются с `revalidatePath`+`redirect`. Список вынесен из серверного `settings/page.tsx`; стили — `alertList.module.scss`.
- **Реальная латентность.** Индексы `Trade(isWhale,ts)`, `Trade(isWhale,marketId)`, `Trade(wallet,isWhale)`, `WhaleWallet(totalVolumeUsdc)` — миграция `add_whale_query_indexes` (аддитивная, применена). `lib/cache.ts` — generic keyed TTL-мемо (тот же подход, что `lib/stats.ts`, осознанно НЕ `unstable_cache` под `force-dynamic`). `lib/whales.ts`/`lib/markets.ts` кэшируют фид (ключ period/category, 60s), лидерборд (filter-independent, 120s), категории (10м) и грид рынков (60s, поиск — мимо кэша). Все значения сведены к примитивам (нет утечки `Decimal`/`Date`).
- **Устойчивость.** `components/RouteError` (на базе `EmptyState`, репорт в Sentry, retry+«на дашборд») + 6 per-route `error.tsx` (dashboard/markets/markets[id]/whales/whales[wallet]/settings). Добавлены `loading.tsx` для `whales/[wallet]` и `settings` (reuse `Skeleton`). Деградация Data API: `getPositionsResult` отдаёт `ok`-флаг → на `/dashboard` отдельное состояние «Live data unavailable» вместо «нет позиций» (не роняет страницу через error-boundary).

Решения (для прозрачности):
- **Без тостов** (по решению пользователя) — обратная связь через pending + optimistic + существующие баннеры `?status=`/`?error=`; новый глобальный канал не вводим.
- Кэш — in-process per-instance (как `lib/stats.ts`), `force-dynamic` сохранён; все TTL ≤ кадэнс соответствующего крона (`aggregate-whales` 60м → лидерборд кэшируется безопасно), поэтому устаревание ограничено.
- Лидерборд `/whales` НЕ зависит от period/category (фиксированные окна 24ч/7д) → в `PendingRegion` обёрнут только фид «Top trades», чтобы индикатор загрузки был честным.
- Затемнение `PendingRegion` сделано `::after`-скримом (а не `opacity` на обёртке), иначе терялись flex-gap’ы внутри регионов.

Проверено локально (DoD — статика):
- `npm run typecheck` (strict), `npm run lint`, `npm test` (49/49), `npm run build` — зелёные; сборка без предупреждений `useSearchParams`/Suspense, все `(app)`-роуты остаются динамическими (ƒ). ✅
- Миграция `add_whale_query_indexes` применена к Neon (4 индекса), `prisma migrate status` — in sync. ✅
- Dev-сервер: публичные `/`,`/signin`,`/whale-watch` → 200; gated-роуты → 307 на `/signin`; в логах рантайм-ошибок нет. ✅
- Новой env-переменной нет.

Ожидает действий пользователя (e2e под аутентификацией — middleware гейтит `(app)`):
- Войти и на `/whales`,`/markets`,`/dashboard` пощёлкать фильтры: пилюля активна мгновенно, регион затемняется + спиннер, контент меняется, scroll сохраняется, работают back/forward; повторный тоггл — быстрый (тёплый кэш); включить reduced-motion → busy читается без вращения.
- Pro: pause/resume/delete алерта в `/settings` обновляются мгновенно.
- Error-boundary: временно `throw` в любом из 6 роутов → стилизованная карточка `RouteError` + «Try again».
- Degraded: недоступность Data API (например, неверный `DATA_API_BASE`) → на `/dashboard` «Live data unavailable», страница не падает.
