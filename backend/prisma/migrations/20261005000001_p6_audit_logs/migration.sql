-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_id_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "actor_role" TEXT,
ADD COLUMN     "device_fingerprint" TEXT,
ADD COLUMN     "method" TEXT,
ADD COLUMN     "path" TEXT,
ADD COLUMN     "request_payload" JSONB,
ADD COLUMN     "status_code" INTEGER,
ADD COLUMN     "user_agent" TEXT,
ALTER COLUMN "actor_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "audit_logs_level_created_at_idx" ON "audit_logs"("level", "created_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
