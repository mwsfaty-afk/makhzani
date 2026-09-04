"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PlanPrice } from "@prisma/client";
import { upsertPlanPriceAction, deletePlanPriceAction } from "../actions";

type SerializablePlanPrice = Omit<PlanPrice, "price"> & { price: number };

export function PlanPriceManager({ planId, prices }: { planId: number; prices: SerializablePlanPrice[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertPlanPriceAction(planId, formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      toast.success("تم حفظ السعر");
      (e.target as HTMLFormElement).reset();
    });
  }

  function handleDelete(planPriceId: number) {
    startTransition(async () => {
      const res = await deletePlanPriceAction(planId, planPriceId);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("تم حذف السعر");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {prices.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الدولة</TableHead>
              <TableHead>العملة</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono">{p.countryCode}</TableCell>
                <TableCell className="font-mono">{p.currency}</TableCell>
                <TableCell className="font-mono tabular-nums">{Number(p.price).toLocaleString("ar")}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" disabled={pending} onClick={() => handleDelete(p.id)}>
                    <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">كود الدولة (SA/EG)</label>
          <Input name="countryCode" maxLength={2} required className="w-20 uppercase" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">العملة</label>
          <Input name="currency" required className="w-24 uppercase" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">السعر</label>
          <Input name="price" type="number" step="0.01" required className="w-28" />
        </div>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "جارٍ الحفظ..." : "إضافة / تحديث"}
        </Button>
      </form>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
