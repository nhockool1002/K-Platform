/*
  Warnings:

  - Added the required column `reason` to the `disputes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "disputes" ADD COLUMN     "reason" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "reject_reason" TEXT;
