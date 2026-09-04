"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Plan } from "@prisma/client";
import { updatePlanAction } from "../actions";

type SerializablePlan = Omit<Plan, "price"> & { price: number };

export function PlanEditForm({ plan }: { plan: SerializablePlan }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updatePlanAction(plan.id, formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      toast.success("تم حفظ الخطة بنجاح");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nameAr">الاسم (عربي)</Label>
          <Input id="nameAr" name="nameAr" defaultValue={plan.nameAr} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency">العملة الافتراضية</Label>
          <Input id="currency" name="currency" defaultValue={plan.currency} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">الوصف</Label>
        <Textarea id="description" name="description" defaultValue={plan.description ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">السعر الافتراضي</Label>
          <Input id="price" name="price" type="number" step="0.01" defaultValue={Number(plan.price)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="durationDays">مدة الاشتراك (يوم)</Label>
          <Input id="durationDays" name="durationDays" type="number" defaultValue={plan.durationDays} required />
        </div>
      </div>

      <h3 className="mt-2 text-sm font-semibold text-muted-foreground">الحدود (Limits)</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { name: "maxUsers", label: "المستخدمون" },
          { name: "maxBranches", label: "الفروع" },
          { name: "maxWarehouses", label: "المخازن" },
          { name: "maxItems", label: "الأصناف" },
          { name: "maxCustomers", label: "العملاء" },
          { name: "maxSuppliers", label: "الموردون" },
          { name: "maxMonthlyDocuments", label: "مستندات شهرية" },
          { name: "maxStorageMb", label: "مساحة تخزين (MB)" },
        ].map((f) => (
          <div key={f.name} className="flex flex-col gap-1.5">
            <Label htmlFor={f.name}>{f.label}</Label>
            <Input
              id={f.name}
              name={f.name}
              type="number"
              defaultValue={plan[f.name as keyof Plan] as number}
              required
            />
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={plan.isActive} className="size-4 rounded border-input" />
          مفعّلة (يمكن الاشتراك بها)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPublic" defaultChecked={plan.isPublic} className="size-4 rounded border-input" />
          معلَنة (تظهر في صفحة الفوترة للعميل)
        </label>
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
      </Button>
    </form>
  );
}
