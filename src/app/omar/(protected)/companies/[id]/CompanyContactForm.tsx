"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateCompanyContactAction } from "../actions";

export function CompanyContactForm({
  companyId,
  initialEmail,
  initialPhone,
}: {
  companyId: number;
  initialEmail: string;
  initialPhone: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateCompanyContactAction(companyId, formData);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      toast.success("تم تحديث بيانات التواصل — يمكن للمالك الآن الدخول بالبريد الجديد");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-email">البريد الإلكتروني (تسجيل الدخول)</Label>
        <Input id="contact-email" name="email" type="email" dir="ltr" defaultValue={initialEmail} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-phone">الهاتف</Label>
        <Input id="contact-phone" name="phone" type="tel" dir="ltr" defaultValue={initialPhone ?? ""} />
      </div>
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" variant="outline" disabled={pending} className="self-start">
        {pending ? "جارٍ الحفظ..." : "حفظ بيانات التواصل"}
      </Button>
    </form>
  );
}
