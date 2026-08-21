import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QuickFormDialog } from "@/components/quick-form-dialog";
import { payToSupplierAction } from "../actions";

const TYPE_LABELS: Record<string, string> = {
  purchase: "فاتورة شراء",
  purchase_return: "مرتجع شراء",
  purchase_cancel: "إلغاء فاتورة شراء",
  payment: "سداد",
  payment_reversal: "عكس سداد",
  opening_balance: "رصيد افتتاحي",
};

export default async function SupplierStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireTenant();

  const supplier = await prisma.supplier.findFirst({ where: { id: Number(id), companyId } });
  if (!supplier) notFound();

  const transactions = await prisma.supplierTransaction.findMany({
    where: { companyId, supplierId: supplier.id },
    orderBy: { id: "asc" },
  });

  const currentBalance = transactions.length > 0 ? transactions[transactions.length - 1].balanceAfter : supplier.openingBalance;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link
        href="/dashboard/suppliers"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        الموردون
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{supplier.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{supplier.code}</p>
        </div>
        <QuickFormDialog
          triggerLabel="سداد"
          title={`سداد لـ ${supplier.name}`}
          action={payToSupplierAction.bind(null, supplier.id)}
          fields={[
            { type: "number", name: "amount", label: "المبلغ", required: true },
            { type: "text", name: "notes", label: "ملاحظات (اختياري)" },
          ]}
        />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4 text-sm">
          <p>
            الرصيد الحالي (المستحق للمورد):{" "}
            <span className="font-mono text-base font-bold tabular-nums">{currentBalance.toString()}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">كشف الحساب ({transactions.length})</CardTitle>
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
                  <TableHead>مدين (سداد/مرتجع)</TableHead>
                  <TableHead>دائن (فاتورة)</TableHead>
                  <TableHead>الرصيد بعدها</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground">{t.date.toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{TYPE_LABELS[t.type] ?? t.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {Number(t.debit) > 0 ? t.debit.toString() : "—"}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-green-700 dark:text-green-400">
                      {Number(t.credit) > 0 ? t.credit.toString() : "—"}
                    </TableCell>
                    <TableCell className="font-mono font-medium tabular-nums">{t.balanceAfter.toString()}</TableCell>
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
