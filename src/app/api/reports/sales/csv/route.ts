import { NextRequest } from "next/server";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const { companyId } = await requireTenant();
  const { searchParams } = new URL(request.url);

  const now = new Date();
  const dateFrom = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(now.getFullYear(), now.getMonth(), 1);
  const dateTo = searchParams.get("to") ? new Date(`${searchParams.get("to")}T23:59:59`) : now;

  const sales = await prisma.sale.findMany({
    where: { companyId, date: { gte: dateFrom, lte: dateTo } },
    include: { customer: true, warehouse: true },
    orderBy: { date: "desc" },
  });

  const csv = toCsv(
    ["رقم الفاتورة", "التاريخ", "العميل", "المخزن", "الإجمالي", "الحالة"],
    sales.map((s) => [s.docNo, s.date.toISOString().slice(0, 10), s.customer.name, s.warehouse.name, s.grandTotal.toString(), s.status]),
  );

  return csvResponse("sales-report.csv", csv);
}
