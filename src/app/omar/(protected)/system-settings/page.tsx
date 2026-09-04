import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExchangeRateManager } from "./ExchangeRateManager";

export default async function AdminSystemSettingsPage() {
  const rates = await prisma.exchangeRateNote.findMany({ orderBy: [{ baseCurrency: "asc" }, { targetCurrency: "asc" }] });
  const serializableRates = rates.map((r) => ({ ...r, rate: Number(r.rate) }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold">إعدادات النظام</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ملحوظات تحويل العملات التقريبية</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            تُعرَض كملحوظة توضيحية بجانب سعر الخطة لدولة غير مُدرَجة في `PlanPrice` — لا تُستخدم أبدًا
            كأساس فعلي للفوترة أو الاسترداد.
          </p>
          <ExchangeRateManager rates={serializableRates} />
        </CardContent>
      </Card>
    </div>
  );
}
