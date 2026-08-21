"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { submitManualProofAction } from "../../actions";

export function SubmitProofForm({ paymentId }: { paymentId: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await submitManualProofAction(paymentId, formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="referenceNumber">رقم المرجع / العملية</Label>
        <Input id="referenceNumber" name="referenceNumber" required placeholder="مثال: 123456789" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="proof">إثبات الدفع (صورة أو PDF، حتى 5 ميجابايت)</Label>
        <Input id="proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required />
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Badge variant="secondary" className="w-fit">
        سيُراجع فريق المنصة الدفعة قبل تفعيل الاشتراك
      </Badge>

      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الإرسال..." : "إرسال بيانات الدفع"}
      </Button>
    </form>
  );
}
