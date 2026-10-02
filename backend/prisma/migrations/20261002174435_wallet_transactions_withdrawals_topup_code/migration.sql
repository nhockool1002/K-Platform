-- CreateEnum
CREATE TYPE "WalletTxType" AS ENUM ('TOPUP_SEPAY', 'WITHDRAWAL_REQUEST', 'CAMPAIGN_RESERVE');

-- CreateEnum
CREATE TYPE "WalletTxSide" AS ENUM ('A', 'B', 'SHARED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "topup_code" TEXT;

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "WalletTxType" NOT NULL,
    "side" "WalletTxSide" NOT NULL DEFAULT 'SHARED',
    "balance_delta_kpoint" BIGINT NOT NULL DEFAULT 0,
    "reserved_delta_kpoint" BIGINT NOT NULL DEFAULT 0,
    "txn_id" TEXT,
    "related_campaign_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount_kpoint" BIGINT NOT NULL,
    "bank_id" TEXT NOT NULL,
    "bank_account_number" TEXT NOT NULL,
    "bank_account_name" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_txn_id_key" ON "wallet_transactions"("txn_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_user_id_created_at_idx" ON "wallet_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "withdrawals_user_id_created_at_idx" ON "withdrawals"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_topup_code_key" ON "users"("topup_code");

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

