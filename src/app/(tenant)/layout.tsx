import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";
import { syncNotifications } from "@/lib/services/notifications/syncNotifications";
import { getNotificationsSummary } from "@/lib/services/notifications/getNotifications";

const STATUS_LABELS: Record<string, string> = {
  TRIALING: "فترة تجريبية",
  ACTIVE: "مفعّل",
  PAST_DUE: "متأخر السداد",
  EXPIRED: "منتهي",
  CANCELLED: "ملغى",
};

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const { companyId, session } = await requireTenant();

  await syncNotifications(companyId);

  const [company, subscription, notificationsSummary] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.subscription.findUnique({ where: { companyId } }),
    getNotificationsSummary(companyId),
  ]);

  const subscriptionLabel = subscription ? STATUS_LABELS[subscription.status] ?? subscription.status : "—";

  return (
    <SidebarProvider>
      <AppSidebar
        companyName={company?.name ?? ""}
        enabledModules={{ sales: company?.salesEnabled ?? true, purchases: company?.purchasesEnabled ?? true }}
      />
      <SidebarInset>
        <Topbar
          userName={session.user.name ?? ""}
          roleName={session.user.roleName}
          subscriptionLabel={subscriptionLabel}
          notifications={notificationsSummary.recent}
          unreadCount={notificationsSummary.unreadCount}
        />
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
