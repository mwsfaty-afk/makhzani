"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSaleReturnAction } from "./actions";

type Line = { saleItemId: number; itemLabel: string; unitLabel: string; soldQty: string; unitPrice: string };

export function SaleReturnForm({ saleId, lines }: { saleId: number; lines: Line[] }) {
  const [qtys, setQtys] = useState<Record<number, string>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totalAmount = lines.reduce((sum, l) => {
    const qty = Number(qtys[l.saleItemId] ?? 0) || 0;
    return sum + qty * Number(l.unitPrice);
  }, 0);

  function handleSubmit(formData: FormData) {
    setError(null);
    const returnLines = lines
      .map((l) => ({ saleItemId: l.saleItemId, qty: Number(qtys[l.saleItemId] ?? 0) || 0 }))
      .filter((l) => l.qty > 0);

    if (returnLines.length === 0) {
      setError("أدخل كمية إرجاع لصنف واحد على الأقل");
      return;
    }
    formData.set("linesJson", JSON.stringify(returnLines));

    startTransition(async () => {
      const res = await createSaleReturnAction(saleId, formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">الأصناف المباعة</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead>الوحدة</TableHead>
                <TableHead>الكمية المباعة</TableHead>
                <TableHead>سعر الوحدة</TableHead>
                <TableHead className="w-32">كمية الإرجاع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.saleItemId}>
                  <TableCell className="font-medium">{l.itemLabel}</TableCell>
                  <TableCell className="text-muted-foreground">{l.unitLabel}</TableCell>
                  <TableCell className="font-mono tabular-nums">{l.soldQty}</TableCell>
                  <TableCell className="font-mono tabular-nums">{l.unitPrice}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      max={l.soldQty}
                      value={qtys[l.saleItemId] ?? ""}
                      onChange={(e) => setQtys((prev) => ({ ...prev, [l.saleItemId]: e.target.value }))}
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="refundMethod">طريقة الاسترداد</Label>
            <Select
              name="refundMethod"
              defaultValue="customer_credit"
              items={[
                { value: "customer_credit", label: "خصم من مديونية العميل" },
                { value: "cash", label: "استرداد نقدي فوري" },
              ]}
            >
              <SelectTrigger id="refundMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_credit">خصم من مديونية العميل</SelectItem>
                <SelectItem value="cash">استرداد نقدي فوري</SelectItem>
              </SelectContent>
            </Select>
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
