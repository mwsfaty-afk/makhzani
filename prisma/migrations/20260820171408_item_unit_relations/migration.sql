-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_purchaseUnitId_fkey" FOREIGN KEY ("purchaseUnitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_salesUnitId_fkey" FOREIGN KEY ("salesUnitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
