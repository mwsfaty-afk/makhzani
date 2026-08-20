"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSaleAction } from "../actions";

type Option = { id: number; label: string };
type ItemOption = {
  id: number;
  label: string;
  baseUnitId: number;
  baseUnitLabel: string;
  salesUnitId: number | null;
  salesUnitLabel: string | null;
  salesUnitFactor: number;
  salePrice: number;
};

type Line = {
  key: number;
  itemId: number | null;
  unitId: number | null;
  qty: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
};

let keySeq = 0;
function emptyLine(): Line {
  return { key: keySeq++, itemId: null, unitId: null, qty: "1", unitPrice: "0", discount: "0", taxRate: "0" };
}

export function SaleForm({
  customers,
  warehouses,
  items,
}: {
  customers: Option[];
  warehouses: Option[];
  items: ItemOption[];
}) {
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function onSelectItem(key: number, itemId: number) {
    const item = itemById.get(itemId);
    if (!item) return;
    const unitId = item.salesUnitId ?? item.baseUnitId;
    const factor = unitId === item.salesUnitId ? item.salesUnitFactor : 1;
    updateLine(key, { itemId, unitId, unitPrice: String(item.salePrice * factor) });
  }

  function unitOptionsFor(itemId: number | null): Option[] {
    const item = itemId ? itemById.get(itemId) : null;
    if (!item) return [];
    const opts: Option[] = [{ id: item.baseUnitId, label: item.baseUnitLabel }];
    if (item.salesUnitId) opts.push({ id: item.salesUnitId, label: `${item.salesUnitLabel} (×${item.salesUnitFactor})` });
    return opts;
  }

  const totals = lines.reduce(
    (acc, l) => {
      const qty = Number(l.qty) || 0;
      const price = Number(l.unitPrice) || 0;
      const discount = Number(l.discount) || 0;
      const taxRate = Number(l.taxRate) || 0;
      const sub = qty * price;
      const tax = (sub - discount) * (taxRate / 100);
      acc.subtotal += sub;
      acc.discount += discount;
      acc.tax += tax;
      acc.grandTotal += sub - discount + tax;
      return acc;
    },
    { subtotal: 0, discount: 0, tax: 0, grandTotal: 0 },
  );

  function handleSubmit(formData: FormData) {
    setError(null);
    const validLines = lines.filter((l) => l.itemId && l.unitId && Number(l.qty) > 0);
    if (validLines.length === 0) {
      setError("أضف صنفًا واحدًا على الأقل بكمية صحيحة");
      return;
    }
    formData.set(
      "linesJson",
      JSON.stringify(
        validLines.map((l) => ({
          itemId: l.itemId,
          unitId: l.unitId,
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice),
          discount: Number(l.discount) || 0,
          taxRate: Number(l.taxRate) || 0,
        })),
      ),
    );
    startTransition(async () => {
      const res = await createSaleAction(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات الفاتورة</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customerId">العميل</Label>
            <Select name="customerId" required>
              <SelectTrigger id="customerId">
                <SelectValue placeholder="اختر العميل..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.label}
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
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">التاريخ</Label>
            <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paidAmount">المُحصَّل الآن (اختياري)</Label>
            <Input id="paidAmount" name="paidAmount" type="number" step="0.0001" defaultValue="0" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الأصناف</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-40">الصنف</TableHead>
                <TableHead className="min-w-32">الوحدة</TableHead>
                <TableHead className="w-24">الكمية</TableHead>
                <TableHead className="w-28">سعر الوحدة</TableHead>
                <TableHead className="w-24">خصم</TableHead>
                <TableHead className="w-20">ضريبة %</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.key}>
                  <TableCell>
                    <Select value={line.itemId ? String(line.itemId) : undefined} onValueChange={(v) => onSelectItem(line.key, Number(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر صنفًا..." />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((i) => (
                          <SelectItem key={i.id} value={String(i.id)}>
                            {i.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={line.unitId ? String(line.unitId) : undefined}
                      onValueChange={(v) => updateLine(line.key, { unitId: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="الوحدة" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptionsFor(line.itemId).map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.0001"
                      value={line.qty}
                      onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.0001"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.0001"
                      value={line.discount}
                      onChange={(e) => updateLine(line.key, { discount: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={line.taxRate}
                      onChange={(e) => updateLine(line.key, { taxRate: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            <Plus />
            إضافة سطر
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col items-end gap-1 py-4 text-sm">
          <p>
            الإجمالي الفرعي: <span className="font-mono tabular-nums">{totals.subtotal.toFixed(4)}</span>
          </p>
          <p>
            الخصم: <span className="font-mono tabular-nums">{totals.discount.toFixed(4)}</span>
          </p>
          <p>
            الضريبة: <span className="font-mono tabular-nums">{totals.tax.toFixed(4)}</span>
          </p>
          <p className="text-base font-bold">
            الإجمالي الكلي: <span className="font-mono tabular-nums">{totals.grandTotal.toFixed(4)}</span>
          </p>
        </CardContent>
      </Card>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : "حفظ كمسودة"}
        </Button>
      </div>
    </form>
  );
}
