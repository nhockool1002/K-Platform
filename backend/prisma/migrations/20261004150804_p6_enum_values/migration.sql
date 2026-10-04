-- AlterEnum (tách riêng: Postgres không cho dùng enum value mới trong cùng transaction với lúc thêm)
ALTER TYPE "BmcTopupStatus" ADD VALUE 'AWAITING_PAYMENT';

-- AlterEnum
ALTER TYPE "WalletTxType" ADD VALUE 'TOPUP_BMC';
