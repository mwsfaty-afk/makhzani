"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPromoCodeAction } from "../actions";

type Option = { id: number; label: string };

export function PromoCodeCreateForm({ plans }: { plans: Option[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createPromoCodeAction(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">الكود</Label>
        <Input id="code" name="code" placeholder="مثال: WELCOME60" required className="font-mono uppercase" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="planId">الباقة الممنوحة</Label>
        <Select name="planId" required items={plans.map((p) => ({ value: String(p.id), label: p.label }))}>
          <SelectTrigger id="planId">
            <SelectValue placeholder="اختر الباقة..." />
          </SelectTrigger>
          <SelectContent>
            {plans.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="durationDays">مدة الاستخدام المجاني (يوم)</Label>
          <Input id="durationDays" name="durationDays" type="number" min={1} defaultValue={60} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxRedemptions">الحد الأقصى للاستخدام</Label>
          <Input id="maxRedemptions" name="maxRedemptions" type="number" min={1} defaultValue={50} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expiresAt">تاريخ انتهاء الكود (اختياري)</Label>
        <Input id="expiresAt" name="expiresAt" type="date" />
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "جارٍ الإنشاء..." : "إنشاء الكود"}
      </Button>
    </form>
  );
}
