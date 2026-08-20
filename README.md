# Makhzani (مخزني) — نظام SaaS لإدارة المخازن والمبيعات والمشتريات

نظام SaaS متعدد الشركات (Multi-Tenant) لإدارة المخزون، المبيعات، المشتريات، العملاء،
الموردين، الخزينة، والأرباح — قابل للتوسع مستقبلًا إلى ERP كامل.

## حالة المشروع

**Phase 0 مكتملة:** المشروع منشور فعليًا (Next.js + Supabase + Vercel + GitHub متصلون ويعملون).
Phase 1 (تسجيل الشركة + الدخول + الأدوار) لم يبدأ بعد.
راجع [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) للوثيقة الكاملة (المعمارية، قاعدة البيانات،
الصلاحيات، خارطة الطريق).

## التقنيات

Next.js 14 (TypeScript) · PostgreSQL (Supabase) · Prisma · NextAuth.js · Tailwind CSS + shadcn/ui ·
نشر عبر Vercel + GitHub. الدول المستهدفة أولًا: السعودية ثم مصر (تفاصيل التسعير حسب الدولة في
`docs/ARCHITECTURE.md` §8.2). بوابة الدفع الأولى: PayTabs (تغطي السوقين معًا).

## لا تعرف كيف تشغّل المشروع؟

اقرأ [`INSTALL.md`](INSTALL.md) — دليل خطوة بخطوة لشخص لا يملك خبرة سابقة.

## هيكل الوثائق

| الملف | المحتوى |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | المعمارية الكاملة: Stack, ERD, API, الصلاحيات, الاشتراكات, محرك المخزون, دورة حياة المستندات, الأمان, خارطة الطريق |
| [`prisma/schema.prisma`](prisma/schema.prisma) | قاعدة البيانات الرسمية (كل الجداول والعلاقات) |
| [`INSTALL.md`](INSTALL.md) | التثبيت والتشغيل محليًا + النشر على Vercel |
