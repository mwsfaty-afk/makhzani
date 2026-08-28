-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "defaultTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "purchasesEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "salesEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "taxEnabled" BOOLEAN NOT NULL DEFAULT false;
