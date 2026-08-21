import { prisma } from "@/lib/db/prisma";

export async function getAdminDashboardData() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    companiesByStatus,
    subscriptionsByStatus,
    revenueThisMonth,
    pendingPaymentsCount,
    recentCompanies,
    totalCompanies,
  ] = await Promise.all([
    prisma.company.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.payment.groupBy({
      by: ["currency"],
      where: { status: "PAID", paidAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { subscription: { include: { plan: true } } },
    }),
    prisma.company.count(),
  ]);

  const statusCount = (rows: { status: string; _count: { _all: number } }[], status: string) =>
    rows.find((r) => r.status === status)?._count._all ?? 0;

  return {
    totalCompanies,
    companies: {
      active: statusCount(companiesByStatus, "ACTIVE"),
      suspended: statusCount(companiesByStatus, "SUSPENDED"),
      cancelled: statusCount(companiesByStatus, "CANCELLED"),
    },
    subscriptions: {
      trialing: statusCount(subscriptionsByStatus, "TRIALING"),
      active: statusCount(subscriptionsByStatus, "ACTIVE"),
      pastDue: statusCount(subscriptionsByStatus, "PAST_DUE"),
      expired: statusCount(subscriptionsByStatus, "EXPIRED"),
      cancelled: statusCount(subscriptionsByStatus, "CANCELLED"),
    },
    revenueThisMonth: revenueThisMonth.map((r) => ({ currency: r.currency, amount: Number(r._sum.amount ?? 0) })),
    pendingPaymentsCount,
    recentCompanies,
  };
}
