import { useId } from "react";

/**
 * أيقونة "مخزني" (الصندوق ثلاثي الأبعاد) — تقريب مؤقت لدليل الهوية البصرية المرفق
 * (2026-08-22)، وليس الملف الرسمي (لا يوجد ملف SVG/PNG مصدري في المشروع حتى الآن).
 * يجب استبدال هذا الملف بالشعار الرسمي بمجرد توفره، دون تغيير الاستخدام في بقية
 * المشروع (كل الاستدعاءات تمر عبر <Logo>/<LogoMark> فقط — راجع Logo.tsx).
 */
export function LogoMark({ className }: { className?: string }) {
  // معرّفات فريدة لكل نسخة — الشعار يظهر أكثر من مرة أحيانًا في نفس الصفحة (Nav + Footer
  // في صفحة الهبوط مثلاً)؛ معرّف gradient ثابت يتصادم بين النسخ (HTML لا يسمح بتكرار id).
  const uid = useId();
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-top`} x1="15" y1="35" x2="85" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
        <linearGradient id={`${uid}-left`} x1="15" y1="35" x2="50" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id={`${uid}-right`} x1="50" y1="55" x2="85" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <polygon points="50,15 85,35 50,55 15,35" fill={`url(#${uid}-top)`} />
      <polygon points="15,35 50,55 50,95 15,75" fill={`url(#${uid}-left)`} />
      <polygon points="85,35 50,55 50,95 85,75" fill={`url(#${uid}-right)`} />
    </svg>
  );
}
