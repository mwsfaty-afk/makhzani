-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
