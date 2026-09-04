import Link from "next/link";
import { TrendingUp, Package, AlertTriangle, ShoppingCart, Truck, PackageX, Zap, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const reports = [
  {
    href: "/dashboard/reports/profit",
    icon: TrendingUp,
    title: "تقرير الأرباح",
    description: "الربح حسب الصنف، العميل، المخزن، والفترة",
  },
  {
    href: "/dashboard/reports/inventory-valuation",
    icon: Package,
    title: "تقييم المخزون",
    description: "القيمة الإجمالية للمخزون الحالي بمتوسط التكلفة",
  },
  {
    href: "/dashboard/reports/low-stock",
    icon: AlertTriangle,
    title: "الأصناف تحت حد الطلب",
    description: "الأصناف التي نفدت أو اقتربت من النفاد",
  },
  {
    href: "/dashboard/reports/dead-stock",
    icon: PackageX,
    title: "الأصناف الراكدة",
    description: "أصناف لها رصيد لكن لم تتحرك منذ فترة محددة",
  },
  {
    href: "/dashboard/reports/fast-moving",
    icon: Zap,
    title: "الأصناف الأكثر حركة",
    description: "أعلى الأصناف كميةً في حركات الصرف خلال فترة محددة",
  },
  {
    href: "/dashboard/reports/expiring",
    icon: CalendarClock,
    title: "أصناف قرب انتهاء الصلاحية",
    description: "تنبيه تقديري بناءً على تواريخ الصلاحية المسجَّلة عند التوريد",
    module: "expiryTracking" as const,
  },
  {
    href: "/dashboard/reports/sales",
    icon: ShoppingCart,
    title: "تقرير المبيعات",
    description: "كل فواتير البيع خلال فترة محددة",
  },
  {
    href: "/dashboard/reports/purchases",
    icon: Truck,
    title: "تقرير المشتريات",
    description: "كل فواتير الشراء خلال فترة محددة",
  },
];

export default async function ReportsIndexPage() {
  const { companyId } = await requireTenant();
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { expiryTrackingEnabled: true } });

  const visibleReports = reports.filter((r) => r.module !== "expiryTracking" || company.expiryTrackingEnabled);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">التقارير</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visibleReports.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="flex items-center gap-3 py-5">
                <r.icon className="size-5 text-primary" />
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
