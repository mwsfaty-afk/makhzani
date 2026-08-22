"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { postStockTakeAction } from "../actions";

type Line = { stockTakeItemId: number; itemLabel: string; bookQty: string; actualQty: string };

export function CountSheetForm({ stockTakeId, lines }: { stockTakeId: number; lines: Line[] }) {
  const [actuals, setActuals] = useState<Record<number, string>>(
    Object.fromEntries(lines.map((l) => [l.stockTakeItemId, l.actualQty])),
  );
  const [pending, startTransition] = useTransition();

  const rows = lines.map((l) => {
    const actual = Number(actuals[l.stockTakeItemId] ?? l.actualQty) || 0;
    const book = Number(l.bookQty);
    return { ...l, actual, diff: actual - book };
  });
  const changedCount = rows.filter((r) => r.diff !== 0).length;

  function handlePost() {
    const formData = new FormData();
    formData.set(
      "countsJson",
      JSON.stringify(rows.map((r) => ({ stockTakeItemId: r.stockTakeItemId, actualQty: r.actual }))),
    );
    startTransition(async () => {
      const res = await postStockTakeAction(stockTakeId, formData);
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الصنف</TableHead>
            <TableHead>الرصيد الدفتري</TableHead>
            <TableHead className="w-32">الكمية الفعلية</TableHead>
            <TableHead>الفرق</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.stockTakeItemId}>
              <TableCell className="font-medium">{r.itemLabel}</TableCell>
              <TableCell className="font-mono tabular-nums text-muted-foreground">{r.bookQty}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.0001"
                  value={actuals[r.stockTakeItemId] ?? r.actualQty}
                  onChange={(e) => setActuals((prev) => ({ ...prev, [r.stockTakeItemId]: e.target.value }))}
                />
              </TableCell>
              <TableCell
                className={
                  r.diff > 0
                    ? "font-mono tabular-nums text-success"
                    : r.diff < 0
                      ? "font-mono tabular-nums text-destructive"
                      : "font-mono tabular-nums text-muted-foreground"
                }
              >
                {r.diff > 0 ? `+${r.diff}` : r.diff}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div>
        <AlertDialog>
          <AlertDialogTrigger render={<Button disabled={pending} />}>
            {pending ? "جارٍ الاعتماد..." : "اعتماد الجرد"}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>اعتماد الجرد؟</AlertDialogTitle>
              <AlertDialogDescription>
                {changedCount > 0
                  ? `سيتم تسوية ${changedCount} صنف (زيادة أو نقص) في المخزون تلقائيًا حسب الفروقات المُدخَلة.`
                  : "لا توجد فروقات — سيتم اعتماد الجرد بدون أي تسوية."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>تراجع</AlertDialogCancel>
              <AlertDialogAction onClick={handlePost}>تأكيد الاعتماد</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
