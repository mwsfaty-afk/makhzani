"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adjustStock } from "./actions";

type Option = { id: number; label: string };

const IN_REASONS = [
  { value: "opening", label: "رصيد افتتاحي" },
  { value: "adjustment", label: "تسوية" },
  { value: "gift", label: "هدية" },
  { value: "production", label: "إنتاج" },
  { value: "other", label: "أخرى" },
];

const OUT_REASONS = [
  { value: "damage", label: "هالك" },
  { value: "consumption", label: "استهلاك" },
  { value: "sample", label: "عينات" },
  { value: "production", label: "إنتاج" },
  { value: "other", label: "أخرى" },
];

export function StockAdjustmentDialog({ items, warehouses }: { items: Option[]; warehouses: Option[] }) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const reasons = direction === "IN" ? IN_REASONS : OUT_REASONS;

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("direction", direction);
    startTransition(async () => {
      const res = await adjustStock(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      toast.success("تم تسجيل الحركة");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        إضافة / صرف مخزون
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>تسوية مخزون</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={direction === "IN" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setDirection("IN")}
              >
                إضافة (وارد)
              </Button>
              <Button
                type="button"
                variant={direction === "OUT" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setDirection("OUT")}
              >
                صرف (صادر)
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="itemId">الصنف</Label>
              <Select name="itemId" required>
                <SelectTrigger id="itemId">
                  <SelectValue placeholder="اختر الصنف..." />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="warehouseId">المخزن</Label>
              <Select name="warehouseId" required>
                <SelectTrigger id="warehouseId">
                  <SelectValue placeholder="اختر المخزن..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={String(wh.id)}>
                      {wh.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">السبب</Label>
              <Select name="reason" required key={direction}>
                <SelectTrigger id="reason">
                  <SelectValue placeholder="اختر السبب..." />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="qty">الكمية</Label>
                <Input id="qty" name="qty" type="number" step="0.0001" required />
              </div>
              {direction === "IN" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="unitCost">تكلفة الوحدة</Label>
                  <Input id="unitCost" name="unitCost" type="number" step="0.0001" required />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">ملاحظات (اختياري)</Label>
              <Input id="notes" name="notes" />
            </div>

            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
