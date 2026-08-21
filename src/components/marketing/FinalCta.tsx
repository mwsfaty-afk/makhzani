import Link from "next/link";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-14">
        <h2 className="text-3xl font-bold text-balance sm:text-4xl">ابدأ بإدارة أعمالك بطريقة أذكى اليوم</h2>
        <p className="max-w-lg text-primary-foreground/85 text-pretty">
          انضم إلى الشركات التي تدير مخزونها ومبيعاتها من مكان واحد، بدون تعقيد.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-lg bg-primary-foreground px-6 py-3.5 text-center text-base font-semibold text-primary transition-opacity hover:opacity-90"
          >
            ابدأ مجانًا
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-primary-foreground/30 px-6 py-3.5 text-center text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </section>
  );
}
