import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QuickFormDialog } from "@/components/quick-form-dialog";
import { createStockTakeAction } from "./actions";

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  DRAFT: { label: "مسودة (جارٍ العد)", variant: "outline" },
  POSTED: { label: "معتمد", variant: "default" },
};

export default async function StockTakePage() {
  const { db } = await requireTenant();
  const [stockTakes, warehouses] = await Promise.all([
    db.stockTake.findMany({ orderBy: { createdAt: "desc" }, include: { warehouse: true, items: true } }),
    db.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>الجرد ({stockTakes.length})</CardTitle>
        <QuickFormDialog
          triggerLabel="جرد جديد"
          title="تجهيز جرد كامل لمخزن"
          description="سيتم التقاط الرصيد الدفتري الحالي لكل الأصناف في المخزن المختار كنقطة بداية"
          action={createStockTakeAction}
          fields={[
            {
              type: "select",
              name: "warehouseId",
              label: "المخزن",
              required: true,
              options: warehouses.map((w) => ({ value: String(w.id), label: w.name })),
            },
          ]}
        />
      </CardHeader>
      <CardContent>
        {stockTakes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد جرد بعد</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الجرد</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>المخزن</TableHead>
                <TableHead>عدد الأصناف</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockTakes.map((st) => {
                const status = STATUS_LABELS[st.status] ?? { label: st.status, variant: "outline" as const };
                return (
                  <TableRow key={st.id}>
                    <TableCell className="font-mono text-sm">
                      <Link href={`/dashboard/inventory/stock-take/${st.id}`} className="text-primary hover:underline">
                        {st.docNo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{st.date.toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell className="font-medium">{st.warehouse.name}</TableCell>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">{st.items.length}</TableCell>
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
