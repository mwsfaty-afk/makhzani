import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PromoCodeEditForm } from "./PromoCodeEditForm";

export default async function PromoCodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const promoId = Number(id);

  const promo = await prisma.promoCode.findUnique({
    where: { id: promoId },
    include: {
      plan: true,
      redemptions: { orderBy: { redeemedAt: "desc" }, include: { company: true } },
    },
  });
  if (!promo) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/admin/promo-codes" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronRight className="size-4" />
        أكواد الخصم
      </Link>

      <h1 className="font-mono text-2xl font-bold">{promo.code}</h1>
      <p className="text-sm text-muted-foreground">
        يمنح باقة <span className="font-medium text-foreground">{promo.plan.nameAr}</span> لمدة{" "}
        <span className="font-medium text-foreground">{promo.durationDays}</span> يوم
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">إعدادات الكود</CardTitle>
        </CardHeader>
        <CardContent>
          <PromoCodeEditForm
            promo={{
              id: promo.id,
              isActive: promo.isActive,
              maxRedemptions: promo.maxRedemptions,
              redeemedCount: promo.redeemedCount,
              expiresAt: promo.expiresAt ? promo.expiresAt.toISOString().slice(0, 10) : "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">من استخدم هذا الكود ({promo.redemptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {promo.redemptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لم يُستخدَم بعد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشركة</TableHead>
                  <TableHead>تاريخ الاستخدام</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promo.redemptions.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.company.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.redeemedAt.toLocaleDateString("ar-EG")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
