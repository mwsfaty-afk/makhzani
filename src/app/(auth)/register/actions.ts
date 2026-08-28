"use server";

import { z } from "zod";
import { registerCompany } from "@/lib/services/billing/registerCompany";
import { redeemPromoCode } from "@/lib/services/billing/redeemPromoCode";
import { toUserErrorMessage } from "@/lib/errors";

const schema = z.object({
  companyName: z.string().min(2, "اسم الشركة قصير جدًا"),
  ownerName: z.string().min(2, "اسم المسؤول قصير جدًا"),
  email: z.string().email("بريد إلكتروني غير صحيح"),
  phone: z.string().optional(),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  country: z.string().min(2, "اختر الدولة"),
  promoCode: z.string().optional(),
});

export type RegisterState = { error?: string; success?: boolean; promoWarning?: string };

export async function registerCompanyAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const raw = {
    companyName: String(formData.get("companyName") ?? ""),
    ownerName: String(formData.get("ownerName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? "") || undefined,
    password: String(formData.get("password") ?? ""),
    country: String(formData.get("country") ?? ""),
    promoCode: String(formData.get("promoCode") ?? "") || undefined,
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  let result: Awaited<ReturnType<typeof registerCompany>>;
  try {
    result = await registerCompany(parsed.data);
  } catch (err) {
    return { error: toUserErrorMessage(err) };
  }

  // كود ترويجي خاطئ لا يجب أن يُفشل تسجيلًا حقيقيًا — الشركة أُنشئت بالفعل بالتجربة
  // العادية، فقط نُعلم المستخدم أن الكود تحديدًا لم يُطبَّق.
  if (parsed.data.promoCode) {
    try {
      await redeemPromoCode(result.companyId, parsed.data.promoCode);
    } catch (err) {
      return { success: true, promoWarning: toUserErrorMessage(err, "تعذّر تطبيق الكود الترويجي") };
    }
  }

  return { success: true };
}
