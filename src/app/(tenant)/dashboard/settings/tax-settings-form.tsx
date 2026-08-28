"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateTaxSettingsAction } from "./actions";

export function TaxSettingsForm({
  initialEnabled,
  initialRate,
}: {
  initialEnabled: boolean;
  initialRate: number;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("taxEnabled", enabled ? "on" : "off");
    startTransition(async () => {
      const res = await updateTaxSettingsAction(formData);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      toast.success("تم حفظ إعدادات الضريبة");
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 text-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="taxEnabled">تفعيل ضريبة القيمة المضافة</Label>
          <p className="text-xs text-muted-foreground">
            عند التفعيل، تظهر نسبة الضريبة تلقائيًا في نماذج الأصناف والمبيعات والمشتريات.
          </p>
        </div>
        <Switch id="taxEnabled" checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="defaultTaxRate">النسبة الافتراضية %</Label>
        <Input
          id="defaultTaxRate"
          name="defaultTaxRate"
          type="number"
          step="0.01"
          min="0"
          max="100"
          defaultValue={initialRate}
          disabled={!enabled}
          className="max-w-40"
        />
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
