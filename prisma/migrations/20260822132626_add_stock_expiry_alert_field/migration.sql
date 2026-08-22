-- AlterTable
ALTER TABLE "StockAdjustmentItem" ADD COLUMN     "expiryDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "expiryDate" TIMESTAMP(3);
