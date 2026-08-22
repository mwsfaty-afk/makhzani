import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  DRAFT: { label: "مسودة", variant: "outline" },
  POSTED: { label: "معتمد", variant: "default" },
};

const DIRECTION_LABELS: Record<string, string> = { IN: "توريد", OUT: "صرف" };

export default async function StockOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string }>;
}) {
  const { direction } = await searchParams;
  const { companyId } = await requireTenant();

  const orders = await prisma.stockAdjustment.findMany({
    where: {
      companyId,
      ...(direction === "IN" || direction === "OUT" ? { direction } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { warehouse: true, items: true },
  });

  const filters = [
    { value: undefined, label: "الكل" },
    { value: "IN", label: "أوامر التوريد" },
    { value: "OUT", label: "أوامر الصرف" },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>أوامر التوريد والصرف ({orders.length})</CardTitle>
        <Button render={<Link href="/dashboard/inventory/stock-orders/new" />} size="sm">
          <Plus />
          أمر جديد
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2 text-sm">
          {filters.map((f) => (
            <Link
              key={f.label}
              href={f.value ? `/dashboard/inventory/stock-orders?direction=${f.value}` : "/dashboard/inventory/stock-orders"}
              className={`rounded-md px-3 py-1.5 ${
                direction === f.value || (!direction && !f.value)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا توجد أوامر بعد</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الأمر</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>المخزن</TableHead>
                <TableHead>عدد الأصناف</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const status = STATUS_LABELS[o.status] ?? { label: o.status, variant: "outline" as const };
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm">
                      <Link href={`/dashboard/inventory/stock-orders/${o.id}`} className="text-primary hover:underline">
                        {o.docNo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={o.direction === "IN" ? "default" : "secondary"}>{DIRECTION_LABELS[o.direction] ?? o.direction}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{o.date.toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell className="text-muted-foreground">{o.warehouse.name}</TableCell>
                    <TableCell className="font-mono tabular-nums">{o.items.length}</TableCell>
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
