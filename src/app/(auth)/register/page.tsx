"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/brand/Logo";
import { registerCompanyAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

const COUNTRY_OPTIONS = [
  { value: "SA", label: "السعودية" },
  { value: "EG", label: "مصر" },
  { value: "OTHER", label: "دولة أخرى" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(registerCompanyAction, initialState);
  // React 19 form actions reset uncontrolled fields once الـ action يكتمل، فقبل ما القيم
  // تختفي من الـ DOM نلقطها هنا وقت الإرسال، عشان نقدر نسجّل الدخول تلقائيًا بعد نجاح
  // التسجيل بدون ما نطلب من المستخدم يكتب بياناته مرة ثانية.
  const submittedCredentials = useRef<{ email: string; password: string } | null>(null);
  const signedIn = useRef(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    submittedCredentials.current = {
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
    };
  }

  useEffect(() => {
    if (!state.success || !submittedCredentials.current || signedIn.current) return;
    signedIn.current = true;
    toast.success("تم إنشاء الحساب بنجاح — جارٍ تسجيل الدخول...");
    const { email, password } = submittedCredentials.current;
    signIn("credentials", { email, password, redirect: false }).then((res) => {
      if (res?.ok) router.push("/dashboard");
    });
  }, [state.success, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo size="lg" />
        <p className="text-sm text-muted-foreground">نظام لإدارة المخازن والمستودعات</p>
      </div>

      <Card>
        <CardHeader className="gap-1.5">
          <CardTitle className="text-2xl">إنشاء حساب شركة جديد</CardTitle>
          <CardDescription>14 يومًا تجربة مجانية — بدون الحاجة لبطاقة ائتمانية</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <form id="register-form" action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="اسم الشركة" name="companyName" required />
              <Field label="اسم المسؤول" name="ownerName" required />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="البريد الإلكتروني" name="email" type="email" required />
              <Field label="رقم الهاتف (اختياري)" name="phone" type="tel" />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="country">الدولة</Label>
                <Select name="country" required defaultValue="SA" items={COUNTRY_OPTIONS}>
                  <SelectTrigger id="country" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Field label="كلمة المرور" name="password" type="password" required minLength={8} />
            </div>

            {state.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
            )}

            <Button type="submit" disabled={pending} className="mt-2 w-full">
              {pending ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        لديك حساب بالفعل؟{" "}
        <Link href="/login" className="font-medium text-primary underline underline-offset-4">
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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} minLength={minLength} />
    </div>
  );
}
