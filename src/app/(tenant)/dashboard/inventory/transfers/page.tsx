import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function TransfersPage() {
  const { db } = await requireTenant();
  const transfers = await db.stockTransfer.findMany({
    orderBy: { createdAt: "desc" },
    include: { fromWarehouse: true, toWarehouse: true, items: true },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>التحويلات ({transfers.length})</CardTitle>
        <Button render={<Link href="/dashboard/inventory/transfers/new" />} size="sm">
          <Plus />
          تحويل جديد
        </Button>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا توجد تحويلات بعد</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم التحويل</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>من مخزن</TableHead>
                <TableHead>إلى مخزن</TableHead>
                <TableHead>عدد الأصناف</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-sm">{t.docNo}</TableCell>
                  <TableCell className="text-muted-foreground">{t.date.toLocaleDateString("ar-EG")}</TableCell>
                  <TableCell className="font-medium">{t.fromWarehouse.name}</TableCell>
                  <TableCell className="font-medium">{t.toWarehouse.name}</TableCell>
                  <TableCell className="font-mono tabular-nums text-muted-foreground">{t.items.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
