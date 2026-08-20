import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DashboardPage() {
  const { db, companyId, session } = await requireTenant();

  const [company, teamMembers, subscription] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    // db (وليس prisma الخام) — كل استعلامات User تُفلتَر تلقائيًا على companyId
    db.user.findMany({ orderBy: { createdAt: "asc" }, include: { role: true } }),
    prisma.subscription.findUnique({ where: { companyId }, include: { plan: true } }),
  ]);

  const trialDaysLeft = subscription?.trialEnd
    ? Math.max(0, Math.ceil((subscription.trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-400">Makhzani</p>
          <h1 className="text-2xl font-bold">{company?.name}</h1>
          <p className="text-sm text-neutral-500">
            مرحبًا {session.user.name} — {session.user.roleName ?? "بدون دور"}
          </p>
        </div>
        <SignOutButton />
      </header>

      {subscription && (
        <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm">
            الخطة الحالية: <b>{subscription.plan.nameAr}</b> — الحالة:{" "}
            <b>{subscription.status === "TRIALING" ? "فترة تجريبية" : subscription.status}</b>
            {trialDaysLeft !== null && (
              <>
                {" "}
                — متبقٍ <b>{trialDaysLeft}</b> يوم
              </>
            )}
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">أعضاء الفريق ({teamMembers.length})</h2>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-right">
              <tr>
                <th className="px-4 py-2 font-medium">الاسم</th>
                <th className="px-4 py-2 font-medium">البريد الإلكتروني</th>
                <th className="px-4 py-2 font-medium">الدور</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id} className="border-t border-neutral-200">
                  <td className="px-4 py-2">
                    {member.name}
                    {member.isOwner && (
                      <span className="ms-2 rounded bg-neutral-900 px-1.5 py-0.5 text-xs text-white">
                        مالك
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{member.email}</td>
                  <td className="px-4 py-2">{member.role?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
