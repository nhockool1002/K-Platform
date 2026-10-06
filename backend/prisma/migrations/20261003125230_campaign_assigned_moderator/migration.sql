-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "assigned_moderator_id" TEXT;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_assigned_moderator_id_fkey" FOREIGN KEY ("assigned_moderator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
