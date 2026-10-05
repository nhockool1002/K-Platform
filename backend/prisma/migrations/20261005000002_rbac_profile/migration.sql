-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('READ', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE');

-- CreateEnum
CREATE TYPE "OverrideEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "full_name" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "province" TEXT;

-- DropTable
DROP TABLE "roles_permissions";

-- CreateTable
CREATE TABLE "access_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "linked_role" "UserRole",
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_group_permissions" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" "PermissionAction" NOT NULL,

    CONSTRAINT "access_group_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_access_groups" (
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,

    CONSTRAINT "user_access_groups_pkey" PRIMARY KEY ("user_id","group_id")
);

-- CreateTable
CREATE TABLE "user_permission_overrides" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "effect" "OverrideEffect" NOT NULL,

    CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "access_groups_name_key" ON "access_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "access_groups_linked_role_key" ON "access_groups"("linked_role");

-- CreateIndex
CREATE UNIQUE INDEX "access_group_permissions_group_id_resource_action_key" ON "access_group_permissions"("group_id", "resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "user_permission_overrides_user_id_resource_action_key" ON "user_permission_overrides"("user_id", "resource", "action");

-- AddForeignKey
ALTER TABLE "access_group_permissions" ADD CONSTRAINT "access_group_permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "access_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_access_groups" ADD CONSTRAINT "user_access_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_access_groups" ADD CONSTRAINT "user_access_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "access_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

