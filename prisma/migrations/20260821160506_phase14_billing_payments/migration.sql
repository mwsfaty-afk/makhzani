/*
  Warnings:

  - Added the required column `planId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "planId" INTEGER NOT NULL,
ADD COLUMN     "proofData" BYTEA,
ADD COLUMN     "proofFileName" TEXT,
ADD COLUMN     "proofMimeType" TEXT,
ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByAdminId" INTEGER;

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
