import Link from "next/link";
import { headers } from "next/headers";
import { getPublicPlans } from "@/lib/services/marketing/getPublicPlans";

/** يجلب الخطط الحقيقية من نفس مصدر البيانات المستخدم في لوحة الفوترة ولوحة الأدمن —
 * أي تغيير سعر/حد من `/omar/plans` ينعكس هنا تلقائيًا، بدون أي نسخة ثانية من البيانات.
 *
 * العملة المعروضة تُحدَّد تلقائيًا من دولة الزائر عبر هيدر `x-vercel-ip-country` (تضيفه
 * شبكة Vercel لكل طلب دون أي إعداد إضافي) — السعودية تشاهد السعر بالريال، وأي دولة أخرى
 * (أو حين لا يتوفر الهيدر، كما في التطوير المحلي) تشاهده بالجنيه المصري افتراضيًا. */
export async function Pricing() {
  const countryCode = (await headers()).get("x-vercel-ip-country") === "SA" ? "SA" : "EG";
  const plans = await getPublicPlans(countryCode);

  if (plans.length === 0) return null;

  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <h2 className="text-3xl font-bold text-balance sm:text-4xl">باقات تناسب حجم عملك</h2>
        <p className="mt-4 text-lg text-muted-foreground text-pretty">
          ابدأ بفترة تجريبية مجانية، وترقَّ متى احتجت لحدود أكبر.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.code} className="flex flex-col rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold">{plan.nameAr}</h3>
            {plan.description && <p className="mt-1.5 text-sm text-muted-foreground">{plan.description}</p>}

            <p className="mt-5 font-mono text-4xl font-bold tabular-nums">
              {plan.price.toLocaleString("ar")}
              <span className="ms-1.5 text-base font-normal text-muted-foreground">{plan.currency} / شهريًا</span>
            </p>

            <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm">
              <PlanLimit label={`حتى ${plan.maxUsers.toLocaleString("ar")} مستخدمين`} />
              <PlanLimit label={`حتى ${plan.maxWarehouses.toLocaleString("ar")} مخازن`} />
              <PlanLimit label={`حتى ${plan.maxItems.toLocaleString("ar")} صنف`} />
              <PlanLimit label={`حتى ${plan.maxMonthlyDocuments.toLocaleString("ar")} مستند شهريًا`} />
            </ul>

            <Link
              href="/register"
              className="mt-6 rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              ابدأ مجانًا
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanLimit({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-muted-foreground">{label}</span>
    </li>
  );
}
