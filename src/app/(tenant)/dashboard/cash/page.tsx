import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { getCashBoxBalance } from "@/lib/services/cash/getCashBoxBalance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QuickFormDialog } from "@/components/quick-form-dialog";
import { createCashBox } from "./actions";

const TYPE_LABELS: Record<string, string> = { cash: "نقدية", bank: "بنك" };

export default async function CashPage() {
  const { db, companyId } = await requireTenant();
  const cashBoxes = await db.cashBox.findMany({ orderBy: { createdAt: "asc" } });
  const balances = await Promise.all(cashBoxes.map((c) => getCashBoxBalance(companyId, c.id)));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>الخزينة ({cashBoxes.length})</CardTitle>
        <QuickFormDialog
          triggerLabel="خزينة جديدة"
          title="إضافة خزينة"
          action={createCashBox}
          fields={[
            { type: "text", name: "name", label: "الاسم", required: true },
            {
              type: "select",
              name: "type",
              label: "النوع",
              defaultValue: "cash",
              options: [
                { value: "cash", label: "نقدية" },
                { value: "bank", label: "بنك" },
              ],
            },
          ]}
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الرصيد الحالي</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashBoxes.map((box, idx) => (
              <TableRow key={box.id}>
                <TableCell className="font-medium">
                  <Link href={`/dashboard/cash/${box.id}`} className="text-primary hover:underline">
                    {box.name}
                  </Link>
                  {box.isDefault && (
                    <Badge variant="outline" className="ms-2">
                      افتراضي
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{TYPE_LABELS[box.type] ?? box.type}</TableCell>
                <TableCell className="font-mono font-medium tabular-nums">
                  {balances[idx].toLocaleString("ar")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
