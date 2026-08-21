/**
 * يُغيّر كلمة مرور PlatformAdmin — يجب تشغيله فور أول Deploy على Production، لأن
 * `prisma/seed.ts` يزرع أدمن أولي بكلمة مرور معروفة (Admin123!) لأغراض التطوير فقط.
 *
 * الاستخدام: npx tsx scripts/change-admin-password.ts <email> <new-password>
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error("الاستخدام: npx tsx scripts/change-admin-password.ts <email> <new-password>");
    process.exit(1);
  }
  if (newPassword.length < 12) {
    console.error("كلمة المرور قصيرة جدًا — استخدم 12 حرفًا على الأقل لحساب أدمن المنصة");
    process.exit(1);
  }

  const admin = await prisma.platformAdmin.findUnique({ where: { email } });
  if (!admin) {
    console.error(`لا يوجد أدمن بالبريد: ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.platformAdmin.update({ where: { email }, data: { passwordHash } });
  console.log(`تم تغيير كلمة مرور ${email} بنجاح.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
