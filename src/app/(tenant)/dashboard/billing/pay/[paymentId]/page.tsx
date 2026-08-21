import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getGateway, manualMethodLabel } from "@/lib/services/billing/gateways";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitProofForm } from "./SubmitProofForm";

export default async function SubmitManualPaymentPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const { companyId } = await requireTenant();

  const payment = await prisma.payment.findFirst({
    where: { id: Number(paymentId), companyId },
    include: { plan: true },
  });
  if (!payment) notFound();

  if (payment.status !== "PENDING" || payment.proofFileName) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            هذه الدفعة تم إرسال بياناتها بالفعل أو لم تعد قابلة للتعديل.
            <div className="mt-4">
              <Link href="/dashboard/billing" className="text-primary underline">
                العودة لصفحة الفوترة
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const gateway = getGateway(payment.gateway);
  const checkoutResult = await gateway.createCheckout({ payment, plan: payment.plan, company, returnUrl: "", cancelUrl: "" });
  const instructions = checkoutResult.kind === "manual" ? checkoutResult.instructions : "";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Link
        href="/dashboard/billing"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        الفوترة والاشتراك
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>إتمام الدفع — {manualMethodLabel(payment.gateway)}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
            <span>{payment.plan.nameAr}</span>
            <span className="font-mono font-bold tabular-nums">
              {Number(payment.amount).toLocaleString("ar")} {payment.currency}
            </span>
          </div>

          <div className="whitespace-pre-line rounded-lg border border-border p-3 text-muted-foreground">{instructions}</div>

          <SubmitProofForm paymentId={payment.id} />
        </CardContent>
      </Card>
    </div>
  );
}
