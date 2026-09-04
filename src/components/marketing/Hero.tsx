import Link from "next/link";
import { DashboardPreview } from "./DashboardPreview";

export function Hero({ trialDays }: { trialDays: number | null }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <div className="flex flex-col items-start gap-6">
          {trialDays !== null && (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-chart-3" />
              تجربة مجانية {trialDays} يومًا — بدون بطاقة ائتمانية
            </span>
          )}

          <h1 className="text-4xl font-bold leading-[1.2] text-balance sm:text-5xl">
            نظام إدارة المخازن والمستودعات <span className="text-primary">بذكاء</span>، من مكان واحد
          </h1>

          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground text-pretty">
            مخزني منصة عربية لإدارة المخزون والمبيعات والمشتريات والعملاء والموردين
            والتقارير — مبنية خصيصًا للشركات الصغيرة والمتوسطة، بصلاحيات دقيقة لكل موظف
            وحماية كاملة لخصوصية بياناتك.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="rounded-lg bg-primary px-6 py-3.5 text-center text-base font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5 hover:bg-primary/90 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              ابدأ مجانًا
            </Link>
            <a
              href="#features"
              className="rounded-lg border border-border bg-card px-6 py-3.5 text-center text-base font-semibold text-foreground transition-colors hover:bg-muted"
            >
              استكشف المميزات
            </a>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
