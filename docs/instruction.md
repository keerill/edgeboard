# Техническое задание: аналитический дашборд для прогнозных рынков (Polymarket)

> Это спецификация для LLM-агента, который будет собирать проект. Читай весь документ перед началом. Все имена таблиц, полей, переменных, эндпоинтов и команд оставляй на английском (как в коде); пояснения — на русском.

---

## 0. Инструкция исполняющей LLM (как работать)

1. Собирай проект **по фазам** (раздел 12). В конце каждой фазы должно быть рабочее, задеплоенное состояние и выполненные критерии приёмки.
2. **Не выдумывай эндпоинты и поля API.** Если сомневаешься — сверяйся с `https://docs.polymarket.com`. В этом ТЗ адреса проверены, но детали полей могут меняться.
3. **Никогда не хардкодь секреты.** Все ключи — через переменные окружения (раздел 11). В репозитории — только `.env.example` с пустыми значениями.
4. Продукт **только на чтение**: никаких размещений ставок/ордеров, никакого хранения чужих средств, никаких приватных ключей пользователей. Не подключай authenticated-эндпоинты CLOB (trading).
5. Пиши TypeScript строго (`strict: true`), añади минимальные тесты на расчёты (P&L, винрейт, определение «кита»).
6. Перед деструктивными действиями (миграции с удалением данных, удаление файлов) — поясняй, что делаешь.
7. Код, комментарии и UI — на английском. Тексты лендинга — на английском (аудитория англоязычная).

---

## 1. Обзор проекта

**Что это.** Веб-приложение по подписке для трейдеров прогнозных рынков Polymarket. Пользователь видит аналитику, которую родной сайт показывает плохо.

**Главная фича («крючок»), за которую платят:**

- **Smart money / «движения китов»** — что крупные кошельки покупают и продают по рынкам.
- **История цены** рынка с наложенными крупными сделками.
- **Сводный P&L портфеля** пользователя (по публичному адресу кошелька) в одном окне.

**Бизнес-модель.** Free-тариф + Pro (~€15/мес). Доход — с подписок, независимо от результатов ставок пользователей. Это информационный инструмент, а не букмекер.

**Кодовое имя (placeholder):** `EdgeBoard` (можно заменить).

---

## 2. Принципы и ограничения (важно для легальности)

- Только аналитика на чтение. **Не** реализовывать: размещение ставок, исполнение «вилок», кошелёк-кастоди, хранение средств.
- На страницах — дисклеймер «Information only, not financial advice». Страницы Terms и Privacy обязательны.
- Соблюдать rate limits и условия использования API Polymarket.
- Адрес кошелька вводится вручную как публичная строка (read-only), без подключения кошелька и без подписи транзакций.

---

## 3. Технологический стек (фиксировано)

- **Framework:** Next.js (App Router) + TypeScript (`strict`)
- **UI:** Tailwind CSS; компоненты — shadcn/ui (опционально)
- **БД:** PostgreSQL (Supabase или Neon); ORM — Prisma или Drizzle (на выбор агента, по умолчанию Prisma)
- **Auth:** NextAuth (Auth.js) — email magic link + Google OAuth
- **Charts:** Recharts
- **Payments:** Stripe (Checkout + Billing Portal + webhooks)
- **Background jobs:** Vercel Cron (эндпоинты `/api/cron/*`, защищённые `CRON_SECRET`)
- **Alerts (v1.1):** Resend (email) и/или Telegram Bot API
- **Hosting:** Vercel; **errors:** Sentry; **analytics:** PostHog или Plausible
- **HTTP:** нативный `fetch` с обёрткой (retry + exponential backoff на 429)

---

## 4. Структура репозитория

```
/app
  /(marketing)            # лендинг, terms, privacy
  /(app)/dashboard        # портфель пользователя
  /(app)/markets          # список рынков
  /(app)/markets/[id]     # страница рынка (график + сделки)
  /(app)/whales           # лента движений китов
  /(app)/settings         # подписка, кошельки
  /api/cron/*             # фоновые задачи
  /api/stripe/webhook     # вебхук Stripe
  /api/auth/*             # NextAuth
/lib
  /polymarket             # клиенты Gamma / CLOB / Data API
  /analytics              # расчёты P&L, винрейт, детектор китов
  /db                     # схема, миграции
/components
/jobs                     # логика ingestion (вызывается из /api/cron)
```

---

## 5. Внешние API Polymarket

Использовать **только публичные read-эндпоинты**. Все клиенты — в `/lib/polymarket`. Везде: кеш (TTL 30–60с), пагинация, exponential backoff на 429.

### Терминология (не перепутать)

- **Condition ID** — идентификатор рынка/вопроса.
- **Token ID** — идентификатор исхода (YES/NO). У рынка два token id: в `clobTokenIds` первый = YES, второй = NO.
- **Proxy wallet (Gnosis Safe)** vs **EOA** — пользователь торгует через прокси-кошелёк; Data API принимает любой из адресов в параметре `user`.

### 5.1 Gamma API — метаданные рынков (`https://gamma-api.polymarket.com`)

- `GET /markets` — список рынков (фильтры active/closed, объём, ликвидность, `clobTokenIds`, `conditionId`).
- `GET /events` и `GET /events/slug/{slug}` — события (группы рынков).
- Авторизация не нужна. Лимит ~60 req/min.

### 5.2 CLOB API — цены/сделки на чтение (`https://clob.polymarket.com`)

- `GET /price?token_id=X` — текущая цена исхода.
- `GET /midpoint?token_id=X` — midpoint.
- `GET /book?token_id=X` — ордербук.
- `GET /trades` — публичные сделки (для ленты).
- История цены: попробовать `GET /prices-history?market={token_id}&interval=...&fidelity=...` (проверить актуальность в доке). Если эндпоинта нет/неудобен — строить историю самим через cron-снимки цен (раздел 7).
- WebSocket — для realtime-обновлений (опционально, не в MVP).

### 5.3 Data API — данные кошелька (`https://data-api.polymarket.com`)

Публичный, без auth для чтения. Кешировать (TTL ~60с).

- `GET /positions?user={address}` — позиции с cost basis, current value, cashPnl, percentPnl. Сортировка `sortBy` (CURRENT, CASHPNL, PERCENTPNL, …), `sortDirection` ASC/DESC. Опц. фильтр `market={conditionId}`.
- `GET /activity?user={address}` — он-чейн активность (сделки/изменения позиций), по убыванию времени; фильтры `market`, `type`.
- `GET /value?user={address}` — суммарная стоимость портфеля (проверить наличие в доке).
- `GET /trades` — сделки (можно фильтровать по размеру для китов).

> Альтернативный источник для OHLCV-свечей и open interest — The Graph Token API (`/markets/ohlcv`, `/markets/open-interest`, `/users/positions`). Можно подключить позже, если нужны готовые свечи вместо собственных снимков.

---

## 6. Модель данных (PostgreSQL)

```
users
  id (pk), email, name, image, created_at

accounts / sessions / verification_tokens   # стандартные таблицы NextAuth

subscriptions
  id (pk), user_id (fk), stripe_customer_id, stripe_subscription_id,
  plan (enum: free|pro), status, current_period_end, created_at, updated_at

tracked_wallets                              # кошельки, которые отслеживает пользователь
  id (pk), user_id (fk), address, label, created_at

markets                                      # кэш рынков из Gamma
  id (pk), condition_id, slug, question, category,
  clob_token_id_yes, clob_token_id_no,
  volume, liquidity, closed (bool), end_date, updated_at

price_snapshots                              # своя история цены
  id (pk), market_id (fk), token_id, price (numeric), ts (timestamptz)
  index (market_id, ts)

trades                                       # сделки/активность (включая китовые)
  id (pk), market_id (fk), wallet, side (buy|sell),
  size_usdc (numeric), price (numeric), is_whale (bool), ts (timestamptz)
  index (ts), index (wallet), index (market_id, ts)

whale_wallets                                # агрегаты по «китам»
  address (pk), total_volume_usdc, realized_pnl, win_rate,
  last_active, updated_at

alerts (v1.1)
  id (pk), user_id (fk), type (whale_move|price_swing|market),
  target (market_id|wallet|threshold), channel (email|telegram), active (bool)
```

Все денежные поля — `numeric`, не float. Любое число на экран — округлять.

---

## 7. Фоновые задачи (ingestion, через Vercel Cron)

Каждый эндпоинт под `/api/cron/*` защищён заголовком/параметром `CRON_SECRET`.

1. **`sync-markets`** (раз в 10–15 мин): тянуть активные рынки из Gamma `/markets` → upsert в `markets`. Для MVP ограничиться топ-N по объёму (например, 200).
2. **`snapshot-prices`** (раз в 5–10 мин): для отслеживаемых рынков сохранять текущую цену (CLOB `/price`) → `price_snapshots`. (Пропустить, если используешь `/prices-history` или The Graph OHLCV.)
3. **`sync-trades`** (раз в 2–5 мин): тянуть свежие сделки/активность (CLOB `/trades` или Data `/activity`) → `trades`; ставить `is_whale = true`, если `size_usdc >= WHALE_THRESHOLD_USDC`.
4. **`aggregate-whales`** (раз в час): пересчитывать `whale_wallets` (объём, PnL, винрейт) по `trades`/Data API.

Всегда: батчи, backoff на 429, идемпотентный upsert по уникальным ключам.

---

## 8. Функциональность по страницам

### `/(marketing)` — Лендинг

- Заголовок продаёт «крючок»: следи за умными деньгами, видь весь P&L в одном месте.
- 3–4 скриншота, блок цены (Free vs Pro), CTA «Sign up».
- Страницы `terms` и `privacy`, дисклеймер.

### `/dashboard` — Портфель (Pro-фича для нескольких кошельков; 1 кошелёк в Free)

- Ввод/выбор публичного адреса (`tracked_wallets`).
- Сводка: total value, P&L (cash и %), win rate, число открытых позиций.
- Таблица позиций (из Data `/positions`): рынок, размер, средняя цена входа, текущая цена, P&L.
- График стоимости портфеля во времени (если есть данные).

### `/markets` — Список рынков

- Поиск/фильтр по категории (политика, спорт, погода, крипто), сортировка по объёму/активности.
- Карточка: вопрос, текущая цена YES, объём, ликвидность.

### `/markets/[id]` — Страница рынка (ключевой экран)

- График истории цены (`price_snapshots` или `/prices-history`).
- Поверх графика — маркеры крупных сделок (`trades.is_whale`).
- Список последних крупных сделок по этому рынку: кошелёк (сокр. адрес), сторона, размер, цена, время.

### `/whales` — Лента движений китов (ключевой экран)

- Топ крупных покупок/продаж за период (24ч / 7д) по всем рынкам.
- Фильтры по категории и размеру; ссылка на рынок и на кошелёк.
- Рейтинг китов по объёму/PnL (`whale_wallets`).

### `/settings`

- Управление подпиской (ссылка в Stripe Billing Portal).
- Управление отслеживаемыми кошельками (лимит по плану).
- Настройки оповещений (v1.1).

---

## 9. Аутентификация

- NextAuth: email magic link + Google OAuth.
- Защищённые роуты — middleware: неавторизованных редиректить на вход.
- При первом входе создавать `subscriptions` с `plan = free`.

---

## 10. Оплата (Stripe)

- Один продукт **Pro** (~€15/мес), `STRIPE_PRICE_ID_PRO`.
- Stripe Checkout для оформления; Billing Portal для отмены/смены карты.
- Вебхук `/api/stripe/webhook` (проверка подписи `STRIPE_WEBHOOK_SECRET`) обновляет `subscriptions` по событиям `checkout.session.completed`, `customer.subscription.updated|deleted`.
- **Гейтинг по плану:**
  - Free: 1 отслеживаемый кошелёк, история до 7 дней, без алертов.
  - Pro: несколько кошельков, полная история, алерты, расширенная лента китов.

---

## 11. Переменные окружения (`.env.example`)

```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EMAIL_SERVER=                # для magic link (или RESEND_API_KEY)
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PRO=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
GAMMA_API_BASE=https://gamma-api.polymarket.com
CLOB_API_BASE=https://clob.polymarket.com
DATA_API_BASE=https://data-api.polymarket.com
CRON_SECRET=
WHALE_THRESHOLD_USDC=5000
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
TELEGRAM_BOT_TOKEN=          # v1.1
```

---

## 12. Порядок сборки по фазам + критерии приёмки

**Фаза 1 — Скелет.**
Next.js + TS + Tailwind, Prisma + Postgres, NextAuth (email+Google), пустые роуты, деплой на Vercel.
_DoD:_ можно зарегистрироваться/войти; приложение задеплоено; миграции применяются.

**Фаза 2 — Ingestion рынков и цен.**
Клиенты Gamma/CLOB; cron `sync-markets` и `snapshot-prices`; таблицы `markets`, `price_snapshots`.
_DoD:_ в БД появляются рынки и снимки цен; `/markets` показывает живые данные.

**Фаза 3 — Сделки и киты.**
Cron `sync-trades` + `aggregate-whales`; страница `/markets/[id]` с графиком и маркерами; страница `/whales`.
_DoD:_ лента китов и график с крупными сделками работают на реальных данных.

**Фаза 4 — Портфель.**
Data API `/positions` (+ `/value`); `/dashboard` с P&L, винрейтом, позициями; `tracked_wallets`.
_DoD:_ по введённому адресу корректно считается и показывается P&L и позиции.

**Фаза 5 — Монетизация.**
Stripe Checkout + Billing Portal + webhook; гейтинг Free/Pro.
_DoD:_ подписка оформляется и отменяется; Pro-фичи открываются только платящим.

**Фаза 6 — Полировка и запуск.**
Лендинг, Terms/Privacy, дисклеймер, Sentry, аналитика, публичный мини-дашборд «whale moves» как контент.
_DoD:_ лендинг конвертит в регистрацию; ошибки логируются; есть публичная страница для маркетинга.

**Фаза 7 (v1.1) — Оповещения.**
Алерты по китам/движению цены через email/Telegram.
_DoD:_ пользователь создаёт алерт и получает уведомление.

---

## 13. Чего НЕ делать (легальность и чистота)

- Не добавлять размещение ставок/ордеров, исполнение вилок, хранение средств, приватные ключи.
- Не продавать «прогнозы/типсы».
- Не нарушать rate limits и условия API.
- Везде сохранять статус «информационный инструмент»; дисклеймер обязателен.

---

## 14. Контент лендинга (черновик для агента, английский)

- Hero: _See what smart money is doing — and your whole P&L in one place._
- Buckets: Whale moves · Price history with big trades · Portfolio P&L · Alerts.
- Pricing: Free (1 wallet, 7-day history) / Pro €15 mo (multi-wallet, full history, alerts).
- Footer: Terms · Privacy · «Information only, not financial advice.»

---

## 15. Не в MVP (на будущее)

- Поддержка Kalshi и других площадок.
- Продвинутый скоринг китов (винрейт, удержание, экспозиция по категориям).
- Командные аккаунты, API для клиентов, мобильное приложение.
- Реалтайм через WebSocket вместо опроса.
