# تنبيه الأعطال (Error Monitoring)

نظام تنبيه بسيط يعتمد على [Sentry](https://sentry.io) (الخطة المجانية — حتى 5,000 خطأ
شهريًا) — يرسل تنبيهًا فوريًا بالإيميل عند حدوث أي عطل حقيقي في الإنتاج (سيرفر أو
متصفح)، بدل الاعتماد على شكوى العميل لمعرفة وجود مشكلة.

## 1. كيف يعمل

| الملف | دوره |
|---|---|
| [src/instrumentation-client.ts](../src/instrumentation-client.ts) | يهيّئ Sentry في المتصفح (اصطلاح Next.js نفسه — يُحمَّل تلقائيًا قبل أي تفاعل) |
| [src/instrumentation.ts](../src/instrumentation.ts) | يهيّئ Sentry في السيرفر، ويلتقط أعطال Server Components/Route Handlers/Server Actions عبر `onRequestError` |
| [src/app/global-error.tsx](../src/app/global-error.tsx) | يلتقط أي عطل يفلت من الـ Root Layout نفسه في المتصفح |
| [src/app/api/monitoring-tunnel/route.ts](../src/app/api/monitoring-tunnel/route.ts) | نفق (Tunnel) يمرّر تقارير الأعطال من المتصفح عبر نطاقنا نفسه بدل نطاق Sentry مباشرة — يتجنب الحاجة لفتح Content-Security-Policy على نطاق خارجي، ولا يتأثر بأدوات حجب الإعلانات |

**بدون `NEXT_PUBLIC_SENTRY_DSN` في متغيرات البيئة، كل ما سبق معطَّل تلقائيًا ولا يعمل شيء
— المنصة تعمل بشكل طبيعي تمامًا بدونه.** هذا يعني عدم وجود أي مخاطرة بتفعيل هذا الملف
قبل ضبط الحساب.

## 2. التفعيل (مرة واحدة)

1. أنشئ حسابًا مجانيًا على [sentry.io](https://sentry.io).
2. من لوحة Sentry: **Create Project** → اختر **Next.js** كمنصة.
3. Sentry سيعرض عليك DSN بالشكل: `https://xxxxx@oXXXXXX.ingest.us.sentry.io/XXXXXXX`
   — انسخه بالكامل.
4. أضف متغير بيئة واحد فقط في Vercel (Production) وفي `.env` المحلي إن أردت رؤية
   الأعطال أثناء التطوير أيضًا:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@oXXXXXX.ingest.us.sentry.io/XXXXXXX
   ```
5. من إعدادات المشروع في Sentry (**Alerts**)، تأكد أن تنبيه البريد الإلكتروني الافتراضي
   مفعّل (مفعّل تلقائيًا عادة عند إنشاء أي مشروع جديد).
6. أعد نشر المشروع في Vercel (Redeploy) بعد إضافة المتغير.

## 3. ما الذي لا يُرسَل لـ Sentry

- لا بيانات بطاقات دفع (لا تمر بخوادمنا أصلًا — راجع [سياسة الخصوصية](../src/app/privacy/page.tsx)).
- `tracesSampleRate: 0` في كل من الملفين — تتبُّع الأخطاء فقط، بدون تتبع أداء (Performance
  Tracing) لتوفير حصة الخطة المجانية بالكامل للأخطاء الفعلية.
