-- AlterEnum
ALTER TYPE "WalletTxType" ADD VALUE 'TASK_REWARD';

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "review_note" TEXT,
ADD COLUMN     "review_url" TEXT;

