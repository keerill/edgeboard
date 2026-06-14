-- CreateIndex
CREATE INDEX "trades_is_whale_ts_idx" ON "trades"("is_whale", "ts");

-- CreateIndex
CREATE INDEX "trades_is_whale_market_id_idx" ON "trades"("is_whale", "market_id");

-- CreateIndex
CREATE INDEX "trades_wallet_is_whale_idx" ON "trades"("wallet", "is_whale");

-- CreateIndex
CREATE INDEX "whale_wallets_total_volume_usdc_idx" ON "whale_wallets"("total_volume_usdc");
