"use server";

import { z } from "zod";
import { registerCompany } from "@/lib/services/billing/registerCompany";
import { toUserErrorMessage } from "@/lib/errors";

const schema = z.object({
  companyName: z.string().min(2, "اسم الشركة قصير جدًا"),
  ownerName: z.string().min(2, "اسم المسؤول قصير جدًا"),
  email: z.string().email("بريد إلكتروني غير صحيح"),
  phone: z.string().optional(),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  country: z.string().min(2, "اختر الدولة"),
});

export type RegisterState = { error?: string; success?: boolean };

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
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  try {
    await registerCompany(parsed.data);
    return { success: true };
  } catch (err) {
    return { error: toUserErrorMessage(err) };
  }
}
