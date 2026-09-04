"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updatePromoCodeAction } from "../actions";

type SerializablePromoCode = {
  id: number;
  isActive: boolean;
  maxRedemptions: number;
  redeemedCount: number;
  expiresAt: string;
};

export function PromoCodeEditForm({ promo }: { promo: SerializablePromoCode }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updatePromoCodeAction(promo.id, formData);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      toast.success("تم حفظ التغييرات");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxRedemptions">الحد الأقصى للاستخدام</Label>
          <Input id="maxRedemptions" name="maxRedemptions" type="number" min={promo.redeemedCount || 1} defaultValue={promo.maxRedemptions} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>عدد مرات الاستخدام حتى الآن</Label>
          <p className="flex h-8 items-center font-mono tabular-nums text-muted-foreground">{promo.redeemedCount}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expiresAt">تاريخ انتهاء الكود (اختياري)</Label>
        <Input id="expiresAt" name="expiresAt" type="date" defaultValue={promo.expiresAt} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={promo.isActive} className="size-4 rounded border-input" />
        مفعّل (يمكن استخدامه)
      </label>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
      </Button>
    </form>
  );
}
