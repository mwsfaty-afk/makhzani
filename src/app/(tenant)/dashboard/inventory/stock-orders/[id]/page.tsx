import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { IN_REASON_LABELS, OUT_REASON_LABELS } from "@/lib/services/inventory/adjustmentReasons";
import { StockOrderStatusActions } from "./status-actions";

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  DRAFT: { label: "مسودة", variant: "outline" },
  POSTED: { label: "معتمد", variant: "default" },
};

const DIRECTION_LABELS: Record<string, string> = { IN: "توريد", OUT: "صرف" };

export default async function StockOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireTenant();

  const order = await prisma.stockAdjustment.findFirst({
    where: { id: Number(id), companyId },
    include: {
      warehouse: true,
      items: { include: { item: true } },
    },
  });
  if (!order) notFound();

  const status = STATUS_LABELS[order.status] ?? { label: order.status, variant: "outline" as const };
  const reasonLabel = order.direction === "IN" ? IN_REASON_LABELS[order.reason as never] : OUT_REASON_LABELS[order.reason as never];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link
        href="/dashboard/inventory/stock-orders"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        أوامر التوريد والصرف
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold">{order.docNo}</h1>
          <p className="text-sm text-muted-foreground">
            {DIRECTION_LABELS[order.direction] ?? order.direction} — {reasonLabel ?? order.reason} — {order.warehouse.name} —{" "}
            {order.date.toLocaleDateString("ar-EG")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          <StockOrderStatusActions orderId={order.id} status={order.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الأصناف</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead>الكمية</TableHead>
                {order.direction === "IN" && <TableHead>تكلفة الوحدة</TableHead>}
                {order.direction === "IN" && <TableHead>تاريخ الصلاحية</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.item.nameAr ?? line.item.name}</TableCell>
                  <TableCell className="font-mono tabular-nums">{line.qty.toString()}</TableCell>
                  {order.direction === "IN" && <TableCell className="font-mono tabular-nums">{line.unitCost.toString()}</TableCell>}
                  {order.direction === "IN" && (
                    <TableCell className="text-muted-foreground">
                      {line.expiryDate ? line.expiryDate.toLocaleDateString("ar-EG") : "—"}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {order.notes && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">{order.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
