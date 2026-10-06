/*
  Warnings:

  - Added the required column `bmc_url` to the `bmc_topups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exchange_rate_usd_to_vnd` to the `bmc_topups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `package_name` to the `bmc_topups` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bmc_topups" ADD COLUMN     "bmc_url" TEXT NOT NULL,
ADD COLUMN     "exchange_rate_usd_to_vnd" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "package_id" TEXT,
ADD COLUMN     "package_name" TEXT NOT NULL,
ADD COLUMN     "reject_reason" TEXT,
ADD COLUMN     "verified_at" TIMESTAMP(3),
ALTER COLUMN "receipt_url" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'AWAITING_PAYMENT';

-- CreateTable
CREATE TABLE "international_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount_usd" DECIMAL(12,2) NOT NULL,
    "bmc_url" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "international_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bmc_topups_user_id_created_at_idx" ON "bmc_topups"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "bmc_topups_status_created_at_idx" ON "bmc_topups"("status", "created_at");

-- AddForeignKey
ALTER TABLE "bmc_topups" ADD CONSTRAINT "bmc_topups_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "international_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
