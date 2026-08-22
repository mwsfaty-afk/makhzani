import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  DRAFT: { label: "مسودة", variant: "outline" },
  POSTED: { label: "معتمدة", variant: "default" },
  CANCELLED: { label: "ملغاة", variant: "destructive" },
};

export default async function SalesPage() {
  const { db } = await requireTenant();
  const sales = await db.sale.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true, warehouse: true },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>المبيعات ({sales.length})</CardTitle>
        <Button render={<Link href="/dashboard/sales/new" />} size="sm">
          <Plus />
          فاتورة بيع جديدة
        </Button>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا توجد فواتير بيع بعد</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المخزن</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>الربح</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => {
                const status = STATUS_LABELS[s.status] ?? { label: s.status, variant: "outline" as const };
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">
                      <Link href={`/dashboard/sales/${s.id}`} className="text-primary hover:underline">
                        {s.docNo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.date.toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell className="font-medium">{s.customer.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.warehouse.name}</TableCell>
                    <TableCell className="font-mono tabular-nums">{s.grandTotal.toString()}</TableCell>
                    <TableCell className="font-mono tabular-nums text-success">
                      {s.status === "POSTED" ? s.totalProfit.toString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
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
