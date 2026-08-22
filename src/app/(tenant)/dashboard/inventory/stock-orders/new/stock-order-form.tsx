"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IN_REASONS, OUT_REASONS, IN_REASON_LABELS, OUT_REASON_LABELS } from "@/lib/services/inventory/adjustmentReasons";
import { createStockOrderAction } from "../actions";

type Option = { id: number; label: string };
type ItemOption = { id: number; label: string; baseUnitLabel: string };

type Line = { key: number; itemId: number | null; qty: string; unitCost: string; expiryDate: string };

let keySeq = 0;
function emptyLine(): Line {
  return { key: keySeq++, itemId: null, qty: "1", unitCost: "0", expiryDate: "" };
}

const IN_REASON_OPTIONS = IN_REASONS.map((value) => ({ value, label: IN_REASON_LABELS[value] }));
const OUT_REASON_OPTIONS = OUT_REASONS.map((value) => ({ value, label: OUT_REASON_LABELS[value] }));

export function StockOrderForm({ warehouses, items }: { warehouses: Option[]; items: ItemOption[] }) {
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const reasons = direction === "IN" ? IN_REASON_OPTIONS : OUT_REASON_OPTIONS;

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    const validLines = lines.filter((l) => l.itemId && Number(l.qty) > 0);
    if (validLines.length === 0) {
      setError("أضف صنفًا واحدًا على الأقل بكمية صحيحة");
      return;
    }
    if (direction === "IN" && validLines.some((l) => !l.unitCost || Number(l.unitCost) < 0)) {
      setError("أدخل تكلفة الوحدة لكل الأصناف");
      return;
    }
    formData.set("direction", direction);
    formData.set(
      "linesJson",
      JSON.stringify(
        validLines.map((l) => ({
          itemId: l.itemId,
          qty: Number(l.qty),
          unitCost: direction === "IN" ? Number(l.unitCost) || 0 : undefined,
          expiryDate: direction === "IN" && l.expiryDate ? l.expiryDate : undefined,
        })),
      ),
    );
    startTransition(async () => {
      const res = await createStockOrderAction(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات الأمر</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex gap-2 sm:col-span-2">
            <Button
              type="button"
              variant={direction === "IN" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setDirection("IN")}
            >
              أمر توريد (وارد)
            </Button>
            <Button
              type="button"
              variant={direction === "OUT" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setDirection("OUT")}
            >
              أمر صرف (صادر)
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="warehouseId">المخزن</Label>
            <Select name="warehouseId" required items={warehouses.map((w) => ({ value: String(w.id), label: w.label }))}>
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
            <Label htmlFor="reason">السبب</Label>
            <Select name="reason" required key={direction} items={reasons}>
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">التاريخ</Label>
            <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <Input id="notes" name="notes" />
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
                <TableHead className="w-24">الكمية</TableHead>
                {direction === "IN" && <TableHead className="w-28">تكلفة الوحدة</TableHead>}
                {direction === "IN" && <TableHead className="w-40">تاريخ الصلاحية (اختياري)</TableHead>}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.key}>
                  <TableCell>
                    <Select
                      value={line.itemId ? String(line.itemId) : ""}
                      onValueChange={(v) => updateLine(line.key, { itemId: Number(v) })}
                      items={items.map((i) => ({ value: String(i.id), label: `${i.label} — ${i.baseUnitLabel}` }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر صنفًا..." />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((i) => (
                          <SelectItem key={i.id} value={String(i.id)}>
                            {i.label} — {i.baseUnitLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.0001" value={line.qty} onChange={(e) => updateLine(line.key, { qty: e.target.value })} />
                  </TableCell>
                  {direction === "IN" && (
                    <TableCell>
                      <Input
                        type="number"
                        step="0.0001"
                        value={line.unitCost}
                        onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                      />
                    </TableCell>
                  )}
                  {direction === "IN" && (
                    <TableCell>
                      <Input type="date" value={line.expiryDate} onChange={(e) => updateLine(line.key, { expiryDate: e.target.value })} />
                    </TableCell>
                  )}
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
            <Plus />
            إضافة سطر
          </Button>
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
