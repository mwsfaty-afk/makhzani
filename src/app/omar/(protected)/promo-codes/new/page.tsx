import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PromoCodeCreateForm } from "./PromoCodeCreateForm";

export default async function NewPromoCodePage() {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link href="/admin/promo-codes" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronRight className="size-4" />
        أكواد الخصم
      </Link>

      <h1 className="text-2xl font-bold">كود خصم جديد</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات الكود</CardTitle>
        </CardHeader>
        <CardContent>
          <PromoCodeCreateForm plans={plans.map((p) => ({ id: p.id, label: p.nameAr }))} />
        </CardContent>
      </Card>
    </div>
  );
}
