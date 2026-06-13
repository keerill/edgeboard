-- CreateTable
CREATE TABLE "markets" (
    "id" TEXT NOT NULL,
    "condition_id" TEXT NOT NULL,
    "slug" TEXT,
    "question" TEXT NOT NULL,
    "category" TEXT,
    "clob_token_id_yes" TEXT,
    "clob_token_id_no" TEXT,
    "volume" DECIMAL(20,6) DEFAULT 0,
    "liquidity" DECIMAL(20,6) DEFAULT 0,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "end_date" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_snapshots" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "price" DECIMAL(12,6) NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "markets_condition_id_key" ON "markets"("condition_id");

-- CreateIndex
CREATE INDEX "price_snapshots_market_id_ts_idx" ON "price_snapshots"("market_id", "ts");

-- AddForeignKey
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
