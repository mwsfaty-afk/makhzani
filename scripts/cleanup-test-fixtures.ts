/**
 * يحذف أي شركة اختبار آلي متبقية (بادئة TEST_AUTOMATED_) لم يُنظّفها afterAll بنجاح —
 * يحدث هذا إذا فشل تشغيل الاختبارات جزئيًا (مثلًا انقطاع اتصال Supabase أثناء التشغيل).
 * شغّله دوريًا أو بعد أي تشغيل اختبارات فشل جزئيًا: npx tsx scripts/cleanup-test-fixtures.ts
 */
import { prisma } from "../src/lib/db/prisma";
import { deleteTestCompany, TEST_COMPANY_PREFIX } from "../tests/helpers/testCompany";

async function main() {
  const residue = await prisma.company.findMany({ where: { name: { startsWith: TEST_COMPANY_PREFIX } } });
  console.log(`Found ${residue.length} leftover test compan${residue.length === 1 ? "y" : "ies"}`);

  for (const company of residue) {
    console.log(`Deleting ${company.id} (${company.name})...`);
    await deleteTestCompany(company.id);
  }

  const clearedAttempts = await prisma.loginAttempt.deleteMany({});
  console.log(`Cleared ${clearedAttempts.count} LoginAttempt row(s)`);
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
