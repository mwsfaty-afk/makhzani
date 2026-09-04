"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateModuleSettingsAction } from "./actions";

export function ModuleSettingsForm({
  initialSales,
  initialPurchases,
  initialExpiryTracking,
}: {
  initialSales: boolean;
  initialPurchases: boolean;
  initialExpiryTracking: boolean;
}) {
  const [sales, setSales] = useState(initialSales);
  const [purchases, setPurchases] = useState(initialPurchases);
  const [expiryTracking, setExpiryTracking] = useState(initialExpiryTracking);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("salesEnabled", sales ? "on" : "off");
    formData.set("purchasesEnabled", purchases ? "on" : "off");
    formData.set("expiryTrackingEnabled", expiryTracking ? "on" : "off");
    startTransition(async () => {
      const res = await updateModuleSettingsAction(formData);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      toast.success("تم حفظ إعدادات الوحدات");
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 text-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="salesEnabled">المبيعات</Label>
          <p className="text-xs text-muted-foreground">
            تعطيلها يخفيها من القائمة الجانبية ويمنع فتح صفحاتها مباشرة.
          </p>
        </div>
        <Switch id="salesEnabled" checked={sales} onCheckedChange={setSales} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="purchasesEnabled">المشتريات</Label>
          <p className="text-xs text-muted-foreground">
            تعطيلها يخفيها من القائمة الجانبية ويمنع فتح صفحاتها مباشرة.
          </p>
        </div>
        <Switch id="purchasesEnabled" checked={purchases} onCheckedChange={setPurchases} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="expiryTrackingEnabled">تتبع تاريخ الصلاحية</Label>
          <p className="text-xs text-muted-foreground">
            يظهر حقل تاريخ الصلاحية عند التوريد، وتقرير الأصناف قرب الانتهاء، وتنبيهات قربها — مفيد للأصناف
            القابلة للتلف (غذائية، أدوية...). مناسب لو نشاطك لا يحتاجه أن يبقى معطَّلًا.
          </p>
        </div>
        <Switch id="expiryTrackingEnabled" checked={expiryTracking} onCheckedChange={setExpiryTracking} />
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
      </div>
    </form>
  );
}
