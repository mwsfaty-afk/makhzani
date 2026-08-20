"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { registerCompanyAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

export default function RegisterPage() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(registerCompanyAction, initialState);
  // React 19 form actions reset uncontrolled fields once the action resolves, فقبل
  // ما القيم تختفي من الـ DOM نلقطها هنا وقت الإرسال، عشان نقدر نسجّل الدخول تلقائيًا
  // بعد نجاح التسجيل بدون ما نطلب من المستخدم يكتب بياناته مرة ثانية.
  const submittedCredentials = useRef<{ email: string; password: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    submittedCredentials.current = {
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
    };
  }

  useEffect(() => {
    if (!state.success || !submittedCredentials.current) return;
    const { email, password } = submittedCredentials.current;
    signIn("credentials", { email, password, redirect: false }).then((res) => {
      if (res?.ok) router.push("/dashboard");
    });
  }, [state.success, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">إنشاء حساب شركة جديد</h1>
        <p className="mt-1 text-sm text-neutral-500">
          14 يومًا تجربة مجانية — بدون الحاجة لبطاقة ائتمانية
        </p>
      </div>

      <form id="register-form" action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="اسم الشركة" name="companyName" required />
        <Field label="اسم المسؤول" name="ownerName" required />
        <Field label="البريد الإلكتروني" name="email" type="email" required />
        <Field label="رقم الهاتف (اختياري)" name="phone" type="tel" />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">الدولة</span>
          <select
            name="country"
            required
            defaultValue="SA"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          >
            <option value="SA">السعودية</option>
            <option value="EG">مصر</option>
            <option value="OTHER">دولة أخرى</option>
          </select>
        </label>

        <Field label="كلمة المرور" name="password" type="password" required minLength={8} />

        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500">
        لديك حساب بالفعل؟{" "}
        <Link href="/login" className="font-medium text-neutral-900 underline">
          تسجيل الدخول
        </Link>
      </p>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />
    </label>
  );
}
