-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "size_usdc" DECIMAL(20,6) NOT NULL,
    "price" DECIMAL(12,6) NOT NULL,
    "is_whale" BOOLEAN NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "tx_hash" TEXT,
    "dedupe_key" TEXT NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whale_wallets" (
    "address" TEXT NOT NULL,
    "total_volume_usdc" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "realized_pnl" DECIMAL(20,6),
    "win_rate" DECIMAL(5,4),
    "last_active" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whale_wallets_pkey" PRIMARY KEY ("address")
);

-- CreateIndex
CREATE UNIQUE INDEX "trades_dedupe_key_key" ON "trades"("dedupe_key");

-- CreateIndex
CREATE INDEX "trades_ts_idx" ON "trades"("ts");

-- CreateIndex
CREATE INDEX "trades_wallet_idx" ON "trades"("wallet");

-- CreateIndex
CREATE INDEX "trades_market_id_ts_idx" ON "trades"("market_id", "ts");

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
