"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createPurchaseReturnAction } from "./actions";

type Line = { purchaseItemId: number; itemLabel: string; unitLabel: string; purchasedQty: string; unitPrice: string };

export function PurchaseReturnForm({ purchaseId, lines }: { purchaseId: number; lines: Line[] }) {
  const [qtys, setQtys] = useState<Record<number, string>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totalAmount = lines.reduce((sum, l) => {
    const qty = Number(qtys[l.purchaseItemId] ?? 0) || 0;
    return sum + qty * Number(l.unitPrice);
  }, 0);

  function handleSubmit(formData: FormData) {
    setError(null);
    const returnLines = lines
      .map((l) => ({ purchaseItemId: l.purchaseItemId, qty: Number(qtys[l.purchaseItemId] ?? 0) || 0 }))
      .filter((l) => l.qty > 0);

    if (returnLines.length === 0) {
      setError("أدخل كمية إرجاع لصنف واحد على الأقل");
      return;
    }
    formData.set("linesJson", JSON.stringify(returnLines));

    startTransition(async () => {
      const res = await createPurchaseReturnAction(purchaseId, formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">الأصناف المشتراة</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead>الوحدة</TableHead>
                <TableHead>الكمية المشتراة</TableHead>
                <TableHead>سعر الوحدة</TableHead>
                <TableHead className="w-32">كمية الإرجاع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.purchaseItemId}>
                  <TableCell className="font-medium">{l.itemLabel}</TableCell>
                  <TableCell className="text-muted-foreground">{l.unitLabel}</TableCell>
                  <TableCell className="font-mono tabular-nums">{l.purchasedQty}</TableCell>
                  <TableCell className="font-mono tabular-nums">{l.unitPrice}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      max={l.purchasedQty}
                      value={qtys[l.purchaseItemId] ?? ""}
                      onChange={(e) => setQtys((prev) => ({ ...prev, [l.purchaseItemId]: e.target.value }))}
                      placeholder="0"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">سبب الإرجاع (اختياري)</Label>
            <Input id="reason" name="reason" />
          </div>
          <p className="text-base font-bold">
            إجمالي المرتجع: <span className="font-mono tabular-nums">{totalAmount.toFixed(4)}</span>
          </p>
        </CardContent>
      </Card>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : "تأكيد المرتجع"}
        </Button>
      </div>
    </form>
  );
}
