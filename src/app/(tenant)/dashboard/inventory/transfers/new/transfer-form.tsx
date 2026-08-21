"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createStockTransferAction } from "../actions";

type Option = { id: number; label: string };
type Line = { key: number; itemId: number | null; qty: string };

let keySeq = 0;
function emptyLine(): Line {
  return { key: keySeq++, itemId: null, qty: "1" };
}

export function TransferForm({ warehouses, items }: { warehouses: Option[]; items: Option[] }) {
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function handleSubmit(formData: FormData) {
    setError(null);

    if (formData.get("fromWarehouseId") === formData.get("toWarehouseId")) {
      setError("لا يمكن التحويل من وإلى نفس المخزن");
      return;
    }

    const validLines = lines
      .filter((l) => l.itemId && Number(l.qty) > 0)
      .map((l) => ({ itemId: l.itemId, qty: Number(l.qty) }));

    if (validLines.length === 0) {
      setError("أضف صنفًا واحدًا على الأقل بكمية صحيحة");
      return;
    }
    formData.set("linesJson", JSON.stringify(validLines));

    startTransition(async () => {
      const res = await createStockTransferAction(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات التحويل</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fromWarehouseId">من مخزن</Label>
            <Select name="fromWarehouseId" required>
              <SelectTrigger id="fromWarehouseId">
                <SelectValue placeholder="اختر المخزن المصدر..." />
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
            <Label htmlFor="toWarehouseId">إلى مخزن</Label>
            <Select name="toWarehouseId" required>
              <SelectTrigger id="toWarehouseId">
                <SelectValue placeholder="اختر المخزن الوجهة..." />
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
                <TableHead className="w-32">الكمية</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.key}>
                  <TableCell>
                    <Select
                      value={line.itemId ? String(line.itemId) : undefined}
                      onValueChange={(v) => updateLine(line.key, { itemId: Number(v) })}
                    >
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
                    <Input
                      type="number"
                      step="0.0001"
                      value={line.qty}
                      onChange={(e) => updateLine(line.key, { qty: e.target.value })}
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">ملاحظات (اختياري)</Label>
        <Input id="notes" name="notes" />
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : "تأكيد التحويل"}
        </Button>
      </div>
    </form>
  );
}
