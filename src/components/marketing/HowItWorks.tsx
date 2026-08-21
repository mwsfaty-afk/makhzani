const STEPS = [
  {
    n: "١",
    title: "أنشئ حسابك",
    description: "سجّل بيانات شركتك في دقائق — يتم تجهيز مخزنك وخزينتك الرئيسية وصلاحياتك تلقائيًا.",
  },
  {
    n: "٢",
    title: "أضف بيانات نشاطك",
    description: "أدخل أصنافك وعملاءك وموردينك، أو استوردها — وحدد أدوار فريقك وصلاحياتهم.",
  },
  {
    n: "٣",
    title: "ابدأ بإدارة أعمالك",
    description: "أصدر فواتيرك، تابع مخزونك لحظيًا، وراجع تقاريرك المالية من لوحة تحكم واحدة.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-muted/40 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-balance sm:text-4xl">يعمل معك خلال دقائق</h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.n} className="relative flex flex-col items-center text-center sm:items-start sm:text-start">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary font-mono text-lg font-bold text-primary-foreground">
                {step.n}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              {i < STEPS.length - 1 && (
                <span
                  className="absolute top-6 hidden h-px w-full bg-border sm:block sm:start-[calc(50%+2rem)] sm:w-[calc(100%-2rem)]"
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
