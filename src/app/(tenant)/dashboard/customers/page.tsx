import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QuickFormDialog } from "@/components/quick-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { createCustomer, deleteCustomer } from "./actions";

export default async function CustomersPage() {
  const { db, companyId } = await requireTenant();
  const customers = await db.customer.findMany({ orderBy: { name: "asc" } });

  const balances = await Promise.all(
    customers.map(async (c) => {
      const lastTxn = await prisma.customerTransaction.findFirst({
        where: { companyId, customerId: c.id },
        orderBy: { id: "desc" },
      });
      return lastTxn ? lastTxn.balanceAfter : c.openingBalance;
    }),
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>العملاء ({customers.length})</CardTitle>
        <QuickFormDialog
          triggerLabel="عميل جديد"
          title="إضافة عميل"
          action={createCustomer}
          fields={[
            { type: "text", name: "code", label: "الكود", required: true },
            { type: "text", name: "name", label: "الاسم", required: true },
            { type: "tel", name: "phone", label: "الهاتف (اختياري)" },
            { type: "email", name: "email", label: "البريد الإلكتروني (اختياري)" },
            { type: "text", name: "taxNumber", label: "الرقم الضريبي (اختياري)" },
            { type: "number", name: "creditLimit", label: "حد الائتمان (اختياري)" },
            { type: "number", name: "openingBalance", label: "الرصيد الافتتاحي (اختياري)" },
          ]}
        />
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد عملاء بعد</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>الرصيد الحالي</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c, idx) => {
                const balance = balances[idx];
                const overLimit = Number(c.creditLimit) > 0 && Number(balance) > Number(c.creditLimit);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.code}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/customers/${c.id}`} className="text-primary hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {balance.toString()}
                      {overLimit && (
                        <Badge variant="destructive" className="ms-2">
                          تجاوز الحد
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DeleteButton itemLabel={c.name} action={deleteCustomer.bind(null, c.id)} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
