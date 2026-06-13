-- CreateTable
CREATE TABLE "tracked_wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracked_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracked_wallets_user_id_idx" ON "tracked_wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracked_wallets_user_id_address_key" ON "tracked_wallets"("user_id", "address");

-- AddForeignKey
ALTER TABLE "tracked_wallets" ADD CONSTRAINT "tracked_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
