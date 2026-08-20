import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const { db, companyId, session } = await requireTenant();

  const [company, teamMembers, subscription] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    db.user.findMany({ orderBy: { createdAt: "asc" }, include: { role: true } }),
    prisma.subscription.findUnique({ where: { companyId }, include: { plan: true } }),
  ]);

  const trialDaysLeft = subscription?.trialEnd
    ? Math.max(0, Math.ceil((subscription.trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">مرحبًا {session.user.name}</h1>
        <p className="text-sm text-muted-foreground">{company?.name}</p>
      </div>

      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الاشتراك</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              الخطة: <b>{subscription.plan.nameAr}</b>
            </span>
            {trialDaysLeft !== null && (
              <Badge variant="secondary" className="font-mono tabular-nums">
                متبقٍ {trialDaysLeft} يوم
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">أعضاء الفريق ({teamMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>الدور</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.name}
                    {member.isOwner && (
                      <Badge variant="outline" className="ms-2">
                        مالك
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>{member.role?.name ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
