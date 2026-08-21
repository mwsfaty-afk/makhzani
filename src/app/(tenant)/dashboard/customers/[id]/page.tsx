import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QuickFormDialog } from "@/components/quick-form-dialog";
import { collectFromCustomerAction } from "../actions";

const TYPE_LABELS: Record<string, string> = {
  sale: "فاتورة بيع",
  sale_return: "مرتجع بيع",
  sale_cancel: "إلغاء فاتورة بيع",
  collection: "تحصيل",
  collection_reversal: "عكس تحصيل",
  refund: "استرداد",
  opening_balance: "رصيد افتتاحي",
};

export default async function CustomerStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireTenant();

  const customer = await prisma.customer.findFirst({ where: { id: Number(id), companyId } });
  if (!customer) notFound();

  const transactions = await prisma.customerTransaction.findMany({
    where: { companyId, customerId: customer.id },
    orderBy: { id: "asc" },
  });

  const currentBalance = transactions.length > 0 ? transactions[transactions.length - 1].balanceAfter : customer.openingBalance;
  const overLimit = Number(customer.creditLimit) > 0 && Number(currentBalance) > Number(customer.creditLimit);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link
        href="/dashboard/customers"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        العملاء
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{customer.code}</p>
        </div>
        <QuickFormDialog
          triggerLabel="تحصيل"
          title={`تحصيل من ${customer.name}`}
          action={collectFromCustomerAction.bind(null, customer.id)}
          fields={[
            { type: "number", name: "amount", label: "المبلغ", required: true },
            { type: "text", name: "notes", label: "ملاحظات (اختياري)" },
          ]}
        />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4 text-sm">
          <p>
            الرصيد الحالي (مديونية العميل):{" "}
            <span className="font-mono text-base font-bold tabular-nums">{currentBalance.toString()}</span>
          </p>
          {customer.creditLimit && Number(customer.creditLimit) > 0 && (
            <p className="text-muted-foreground">
              حد الائتمان: <span className="font-mono tabular-nums">{customer.creditLimit.toString()}</span>
            </p>
          )}
          {overLimit && <Badge variant="destructive">تجاوز حد الائتمان</Badge>}
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
                  <TableHead>مدين (فاتورة)</TableHead>
                  <TableHead>دائن (سداد/مرتجع)</TableHead>
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
