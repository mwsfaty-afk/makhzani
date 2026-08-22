import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getCashBoxBalance } from "@/lib/services/cash/getCashBoxBalance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QuickFormDialog } from "@/components/quick-form-dialog";
import { recordCashTransactionAction, transferCashAction } from "../actions";

const TYPE_LABELS: Record<string, string> = {
  RECEIPT: "قبض",
  PAYMENT: "صرف",
  TRANSFER: "تحويل",
  CUSTOMER_COLLECTION: "تحصيل من عميل",
  SUPPLIER_PAYMENT: "سداد لمورد",
};

export default async function CashBoxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireTenant();

  const cashBox = await prisma.cashBox.findFirst({ where: { id: Number(id), companyId } });
  if (!cashBox) notFound();

  const [balance, transactions, otherBoxes] = await Promise.all([
    getCashBoxBalance(companyId, cashBox.id),
    prisma.cashTransaction.findMany({ where: { companyId, cashBoxId: cashBox.id }, orderBy: { id: "asc" } }),
    prisma.cashBox.findMany({ where: { companyId, id: { not: cashBox.id } } }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link
        href="/dashboard/cash"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        الخزينة
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{cashBox.name}</h1>
          <p className="text-sm text-muted-foreground">{cashBox.type === "cash" ? "نقدية" : "بنك"}</p>
        </div>
        <div className="flex gap-2">
          <QuickFormDialog
            triggerLabel="قبض / صرف"
            title="حركة نقدية"
            action={recordCashTransactionAction.bind(null, cashBox.id)}
            fields={[
              {
                type: "select",
                name: "type",
                label: "النوع",
                defaultValue: "RECEIPT",
                options: [
                  { value: "RECEIPT", label: "قبض (وارد)" },
                  { value: "PAYMENT", label: "صرف (صادر)" },
                ],
              },
              { type: "number", name: "amount", label: "المبلغ", required: true },
              { type: "text", name: "notes", label: "ملاحظات (اختياري)" },
            ]}
          />
          {otherBoxes.length > 0 && (
            <QuickFormDialog
              triggerLabel="تحويل"
              title={`تحويل من ${cashBox.name}`}
              action={transferCashAction.bind(null, cashBox.id)}
              fields={[
                {
                  type: "select",
                  name: "toCashBoxId",
                  label: "إلى خزينة",
                  required: true,
                  options: otherBoxes.map((b) => ({ value: String(b.id), label: b.name })),
                },
                { type: "number", name: "amount", label: "المبلغ", required: true },
                { type: "text", name: "notes", label: "ملاحظات (اختياري)" },
              ]}
            />
          )}
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <p>
            الرصيد الحالي: <span className="font-mono text-lg font-bold tabular-nums">{balance.toLocaleString("ar")}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الحركات ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد حركات بعد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>وارد</TableHead>
                  <TableHead>صادر</TableHead>
                  <TableHead>ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground">{t.date.toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{TYPE_LABELS[t.type] ?? t.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-success">
                      {t.direction === "IN" ? t.amount.toString() : "—"}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-destructive">
                      {t.direction === "OUT" ? t.amount.toString() : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
