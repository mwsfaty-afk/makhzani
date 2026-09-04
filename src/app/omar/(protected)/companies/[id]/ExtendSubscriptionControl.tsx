"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extendSubscriptionAction } from "../actions";

export function ExtendSubscriptionControl({ companyId }: { companyId: number }) {
  const [days, setDays] = useState("30");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await extendSubscriptionAction(companyId, Number(days));
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`تم تمديد الاشتراك حتى ${new Date(res.newPeriodEnd).toLocaleDateString("ar-EG")}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">تمديد المدة (يوم)</label>
        <Input
          type="number"
          min={1}
          max={3650}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="w-24"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "جارٍ التمديد..." : "تمديد"}
      </Button>
    </form>
  );
}
