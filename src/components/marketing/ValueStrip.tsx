const VALUES = [
  "إدارة المخزون",
  "المبيعات والمشتريات",
  "العملاء والموردون",
  "الخزينة والتحصيلات",
  "التقارير والتصدير",
  "صلاحيات المستخدمين",
];

export function ValueStrip() {
  return (
    <section className="border-y border-border bg-muted/40" aria-label="أبرز قدرات المنصة">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-muted-foreground">
          {VALUES.map((v) => (
            <li key={v} className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {v}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
