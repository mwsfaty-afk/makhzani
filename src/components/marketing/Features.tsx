type Feature = { title: string; description: string; path: string };

const FEATURES: Feature[] = [
  {
    title: "إدارة المخزون",
    description:
      "أصناف ووحدات ومجموعات وعلامات تجارية، مع محرك حركة مخزون يحسب متوسط التكلفة المرجّح تلقائيًا ويمنع أي تعديل يدوي للأرصدة.",
    path: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 4v10M4 7v10l8 4",
  },
  {
    title: "المبيعات والمشتريات",
    description:
      "فواتير بيع وشراء بدورة حياة كاملة (مسودة → اعتماد → إلغاء)، مع فحص فوري للمخزون السالب عند البيع.",
    path: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m-9 4a1 1 0 100 2 1 1 0 000-2zm9 0a1 1 0 100 2 1 1 0 000-2z",
  },
  {
    title: "المرتجعات والتحويلات",
    description: "مرتجعات مرتبطة بالفاتورة الأصلية، وتحويلات بين المخازن مع منع التحويل لنفس المخزن، وجرد دوري يولّد التسويات تلقائيًا.",
    path: "M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114-6.7M20 15a9 9 0 01-14 6.7",
  },
  {
    title: "العملاء والموردون",
    description: "كشوف حساب تفصيلية برصيد متحرك، تنبيه عند تجاوز حد الائتمان، وتحصيل/سداد مستقل غير مرتبط بفاتورة.",
    path: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-8a4 4 0 11-8 0 4 4 0 018 0zm6 3a4 4 0 10-8 0",
  },
  {
    title: "الخزينة",
    description: "خزائن نقدية متعددة، قبض وصرف مستقل، وتحويل بين الخزائن — برصيد حي محسوب من كل الحركات لحظيًا.",
    path: "M12 8c-1.657 0-3 .672-3 1.5S10.343 11 12 11s3 .672 3 1.5-1.343 1.5-3 1.5m0-6V6m0 8v2m9-4a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "التقارير",
    description: "تقييم المخزون، الأصناف تحت حد الطلب، تقارير المبيعات والمشتريات، وتقرير الأرباح — كلها قابلة للتصدير CSV.",
    path: "M9 17v-6m4 6v-10m4 10v-3M4 20h16M4 4h16v16H4V4z",
  },
  {
    title: "صلاحيات دقيقة لكل موظف",
    description: "أدوار جاهزة (مالك، محاسب، أمين مخزن، مبيعات، أمين صندوق...) قابلة للتخصيص لكل مستخدم على مستوى كل عملية.",
    path: "M12 15a3 3 0 100-6 3 3 0 000 6zm-7 4a7 7 0 0114 0",
  },
  {
    title: "عزل تام لبيانات كل شركة",
    description: "كل شركة تعمل في بيئة معزولة بالكامل عن غيرها — لا يمكن لأي مستخدم الوصول لبيانات شركة أخرى مهما تعمّد ذلك.",
    path: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <h2 className="text-3xl font-bold text-balance sm:text-4xl">كل ما تحتاجه لإدارة أعمالك</h2>
        <p className="mt-4 text-lg text-muted-foreground text-pretty">
          نظام واحد متكامل، بدل الاعتماد على جداول بيانات متفرقة أو أدوات منفصلة لا تتحدث مع بعضها.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={feature.path} />
              </svg>
            </span>
            <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
