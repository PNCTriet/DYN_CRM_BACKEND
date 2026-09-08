-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'PENDING_APPROVAL';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");
