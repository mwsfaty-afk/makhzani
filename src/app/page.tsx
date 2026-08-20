export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
        Stock Prog · Phase 0
      </span>
      <h1 className="text-3xl font-bold">التجهيز الأساسي يعمل بنجاح</h1>
      <p className="max-w-md text-neutral-500">
        هذه صفحة مؤقتة للتأكد من أن المشروع، التصميم، واللغة العربية (RTL) مُعدّة بشكل صحيح.
        الشاشات الفعلية (تسجيل الدخول، لوحة التحكم، المخزون...) تُبنى بدءًا من Phase 1.
      </p>
    </main>
  );
}
