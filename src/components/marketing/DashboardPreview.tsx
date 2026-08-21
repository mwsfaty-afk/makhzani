/**
 * معاينة لوحة تحكم توضيحية — CSS/SVG بحتة (بدون صورة، بدون Recharts، بدون أي حزمة رسوم
 * بيانية) لتبقى الصفحة الرئيسية خفيفة تمامًا. أرقام تقريبية توضيحية، ليست بيانات حقيقية.
 */
const TREND_POINTS = [22, 30, 26, 38, 34, 46, 40, 52, 48, 60, 55, 68];

function sparklinePath(points: number[], width: number, height: number) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  return points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

const KPIS = [
  { label: "مبيعات الشهر", value: "48,200", unit: "ر.س" },
  { label: "قيمة المخزون", value: "312,500", unit: "ر.س" },
  { label: "العملاء النشطون", value: "86", unit: "" },
];

export function DashboardPreview() {
  const width = 320;
  const height = 90;
  const linePath = sparklinePath(TREND_POINTS, width, height);
  const fillPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <div
      className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10"
      role="img"
      aria-label="معاينة توضيحية للوحة تحكم مخزني تعرض مؤشرات المبيعات والمخزون"
    >
      {/* شريط علوي يشبه نافذة تطبيق */}
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-3">
        <span className="size-2.5 rounded-full bg-destructive/40" />
        <span className="size-2.5 rounded-full bg-chart-2/50" />
        <span className="size-2.5 rounded-full bg-chart-3/50" />
        <span className="ms-3 rounded-md bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          app.makhzani.com/dashboard
        </span>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-3 gap-3">
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-border bg-background/60 p-3">
              <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
                {kpi.value}
                {kpi.unit && <span className="ms-1 text-xs font-normal text-muted-foreground">{kpi.unit}</span>}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-background/60 p-3">
          <p className="mb-2 text-[11px] text-muted-foreground">المبيعات — آخر 14 يومًا</p>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" preserveAspectRatio="none" aria-hidden="true">
            <path d={fillPath} fill="var(--chart-1)" opacity="0.12" />
            <path d={linePath} fill="none" stroke="var(--chart-1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-chart-3/15 text-chart-3">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span className="text-xs font-medium text-foreground">فاتورة بيع #SAL-000482 معتمدة</span>
          </div>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">قبل 3 دقائق</span>
        </div>
      </div>
    </div>
  );
}
