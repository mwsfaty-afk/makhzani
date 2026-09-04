import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanEditForm } from "./PlanEditForm";
import { PlanPriceManager } from "./PlanPriceManager";

export default async function AdminPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const planId = Number(id);

  const plan = await prisma.plan.findUnique({ where: { id: planId }, include: { prices: { orderBy: { countryCode: "asc" } } } });
  if (!plan) notFound();

  // Prisma's Decimal لا يمكن تمريره كما هو من Server Component إلى Client Component
  // (ليس Plain Object قابلًا للتسلسل) — يُحوَّل لرقم عادي هنا قبل التمرير. `prices` نفسها
  // تُستبعد من كائن الخطة الممرَّر لـ PlanEditForm (غير مستخدمة هناك، وتحمل Decimal متداخلة
  // كانت ستُفشل الفحص نفسه لو بقيت ضمن الكائن حتى بعد تحويل `price` الخاص بالخطة نفسها).
  const { prices, ...planWithoutPrices } = plan;
  const serializablePlan = { ...planWithoutPrices, price: Number(plan.price) };
  const serializablePrices = prices.map((p) => ({ ...p, price: Number(p.price) }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/omar/plans" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronRight className="size-4" />
        الخطط
      </Link>

      <h1 className="text-2xl font-bold">{plan.nameAr}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات الخطة والحدود</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanEditForm plan={serializablePlan} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">أسعار حسب الدولة</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanPriceManager planId={plan.id} prices={serializablePrices} />
        </CardContent>
      </Card>
    </div>
  );
}
