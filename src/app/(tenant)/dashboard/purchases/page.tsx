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

export default async function PurchasesPage() {
  const { db } = await requireTenant();
  const purchases = await db.purchase.findMany({
    orderBy: { createdAt: "desc" },
    include: { supplier: true, warehouse: true },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>المشتريات ({purchases.length})</CardTitle>
        <Button render={<Link href="/dashboard/purchases/new" />} size="sm">
          <Plus />
          فاتورة شراء جديدة
        </Button>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا توجد فواتير شراء بعد</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>المورد</TableHead>
                <TableHead>المخزن</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((p) => {
                const status = STATUS_LABELS[p.status] ?? { label: p.status, variant: "outline" as const };
                return (
                  <TableRow key={p.id} className="cursor-pointer">
                    <TableCell className="font-mono text-sm">
                      <Link href={`/dashboard/purchases/${p.id}`} className="text-primary hover:underline">
                        {p.docNo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.date.toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell className="font-medium">{p.supplier.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.warehouse.name}</TableCell>
                    <TableCell className="font-mono tabular-nums">{p.grandTotal.toString()}</TableCell>
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
