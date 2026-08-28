"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redeemPromoCodeAction } from "./actions";

export function PromoCodeForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await redeemPromoCodeAction(formData);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      toast.success(`تم تفعيل باقة "${res?.planNameAr}" بنجاح`);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input name="code" placeholder="أدخل الكود الترويجي" required className="flex-1" />
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ التفعيل..." : "تفعيل"}
        </Button>
      </div>
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
    </form>
  );
}
