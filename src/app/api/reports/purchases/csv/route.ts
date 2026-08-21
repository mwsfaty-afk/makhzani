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

  const purchases = await prisma.purchase.findMany({
    where: { companyId, date: { gte: dateFrom, lte: dateTo } },
    include: { supplier: true, warehouse: true },
    orderBy: { date: "desc" },
  });

  const csv = toCsv(
    ["رقم الفاتورة", "التاريخ", "المورد", "المخزن", "الإجمالي", "الحالة"],
    purchases.map((p) => [p.docNo, p.date.toISOString().slice(0, 10), p.supplier.name, p.warehouse.name, p.grandTotal.toString(), p.status]),
  );

  return csvResponse("purchases-report.csv", csv);
}
