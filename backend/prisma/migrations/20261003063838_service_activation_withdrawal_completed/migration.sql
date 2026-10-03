-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WalletTxType" ADD VALUE 'ACCOUNT_ACTIVATION';
ALTER TYPE "WalletTxType" ADD VALUE 'WITHDRAWAL_COMPLETED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "service_activated_at" TIMESTAMP(3);

