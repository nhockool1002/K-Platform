-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "min_trust_score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "survey_questions" JSONB;

-- AlterTable
-- proof_url / auto_approve_at giờ chỉ được điền khi Bên B thực sự nộp Proof
-- (Phase 4) — tại thời điểm ứng tuyển (Phase 3) submission chưa có proof.
ALTER TABLE "submissions" ALTER COLUMN "proof_url" DROP NOT NULL,
ALTER COLUMN "auto_approve_at" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'APPLIED';
ALTER TABLE "submissions" ADD COLUMN     "survey_answers" JSONB,
ADD COLUMN     "fingerprint_hash" TEXT,
ADD COLUMN     "ip" TEXT;

-- CreateIndex
-- Bên B chỉ ứng tuyển/nhận tối đa 1 slot/campaign (P4-08) — chặn ngay từ bước apply.
CREATE UNIQUE INDEX "submissions_campaign_id_publisher_id_key" ON "submissions"("campaign_id", "publisher_id");

-- CreateIndex
CREATE INDEX "submissions_campaign_id_fingerprint_hash_idx" ON "submissions"("campaign_id", "fingerprint_hash");

-- CreateIndex
CREATE INDEX "submissions_campaign_id_ip_idx" ON "submissions"("campaign_id", "ip");
