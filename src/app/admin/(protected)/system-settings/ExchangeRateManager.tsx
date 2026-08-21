"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ExchangeRateNote } from "@prisma/client";
import { upsertExchangeRateAction, deleteExchangeRateAction } from "./actions";

type SerializableExchangeRateNote = Omit<ExchangeRateNote, "rate"> & { rate: number };

export function ExchangeRateManager({ rates }: { rates: SerializableExchangeRateNote[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertExchangeRateAction(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      toast.success("تم حفظ سعر الصرف");
      (e.target as HTMLFormElement).reset();
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteExchangeRateAction(id);
      toast.success("تم الحذف");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {rates.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>من</TableHead>
              <TableHead>إلى</TableHead>
              <TableHead>السعر التقريبي</TableHead>
              <TableHead>آخر تحديث</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.baseCurrency}</TableCell>
                <TableCell className="font-mono">{r.targetCurrency}</TableCell>
                <TableCell className="font-mono tabular-nums">{Number(r.rate).toLocaleString("ar")}</TableCell>
                <TableCell className="text-muted-foreground">{r.updatedAt.toLocaleDateString("ar-EG")}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" disabled={pending} onClick={() => handleDelete(r.id)}>
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
          <label className="text-xs text-muted-foreground">من عملة</label>
          <Input name="baseCurrency" maxLength={3} required className="w-20 uppercase" placeholder="EGP" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">إلى عملة</label>
          <Input name="targetCurrency" maxLength={3} required className="w-20 uppercase" placeholder="SAR" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">السعر التقريبي</label>
          <Input name="rate" type="number" step="0.000001" required className="w-32" />
        </div>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "جارٍ الحفظ..." : "إضافة / تحديث"}
        </Button>
      </form>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
