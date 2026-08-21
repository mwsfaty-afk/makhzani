/** أسئلة شائعة — بدون أي JavaScript: `<details>/<summary>` أصلي في المتصفح. */
function faqItems(trialDays: number | null) {
  return [
    {
      q: "ما هو مخزني؟",
      a: "منصة عربية لإدارة المخزون والمبيعات والمشتريات والعملاء والموردين والخزينة والتقارير — كل ذلك من لوحة تحكم واحدة، مصمَّمة للشركات الصغيرة والمتوسطة.",
    },
    {
      q: "هل يمكنني تجربة المنصة قبل الاشتراك؟",
      a:
        trialDays !== null
          ? `نعم، يحصل كل حساب جديد على فترة تجريبية مجانية مدتها ${trialDays} يومًا دون الحاجة لبطاقة ائتمانية.`
          : "نعم، يمكنك إنشاء حساب والتعرف على المنصة قبل اختيار إحدى الباقات المدفوعة.",
    },
    {
      q: "ما الفرق بين الباقات؟",
      a: "تختلف الباقات في عدد المستخدمين والمخازن والأصناف وعدد المستندات الشهرية المسموح بها — يمكنك مراجعة الحدود التفصيلية لكل باقة في قسم الأسعار أعلاه، والترقية لاحقًا من داخل لوحة التحكم متى احتجت لحدود أكبر.",
    },
    {
      q: "هل يمكنني إدارة المستخدمين وصلاحياتهم؟",
      a: "نعم — يمكنك إضافة أعضاء فريقك وتحديد دور كل واحد منهم (مالك، محاسب، أمين مخزن، مبيعات، أمين صندوق، وغيرها)، مع إمكانية تخصيص صلاحيات كل مستخدم بدقة.",
    },
    {
      q: "كيف يتم الدفع؟",
      a: "عبر PayPal، أو تحويلًا يدويًا (فودافون كاش أو تحويل بنكي) مع رفع إثبات الدفع ومراجعته من فريق مخزني قبل تفعيل الباقة.",
    },
    {
      q: "ماذا يحدث عند انتهاء الاشتراك؟",
      a: "تبقى بياناتك محفوظة بالكامل، وتتحول لوحة التحكم لوضع القراءة فقط حتى تجديد الاشتراك — لا يتم حذف أي بيانات أبدًا.",
    },
  ];
}

export function Faq({ trialDays }: { trialDays: number | null }) {
  const items = faqItems(trialDays);

  return (
    <section id="faq" className="scroll-mt-20 bg-muted/40 py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="mb-10 text-center text-3xl font-bold text-balance sm:text-4xl">الأسئلة الشائعة</h2>

        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <details key={item.q} className="group rounded-xl border border-border bg-card px-5 py-4 open:pb-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold marker:content-none">
                {item.q}
                <svg
                  viewBox="0 0 24 24"
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
