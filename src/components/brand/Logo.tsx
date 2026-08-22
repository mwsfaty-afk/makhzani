import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogoMark } from "./LogoMark";

type LogoProps = {
  /** "full" = أيقونة + اسم (الافتراضي) — "mark" = الأيقونة فقط، لأماكن ضيقة كالقائمة المطوية. */
  variant?: "full" | "mark";
  /** يضبط لون النص لخلفية داكنة (Sidebar/Footer) بدل النص الافتراضي. */
  theme?: "auto" | "light";
  /** رابط الشعار — null لتعطيل الـ Link (استخدام الشعار كعنصر عرض فقط، بدون تنقّل). */
  href?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES: Record<NonNullable<LogoProps["size"]>, { mark: string; text: string }> = {
  sm: { mark: "size-6", text: "text-sm" },
  md: { mark: "size-8", text: "text-base" },
  lg: { mark: "size-10", text: "text-lg" },
};

/**
 * نقطة الاستخدام الموحَّدة الوحيدة للشعار في كل المشروع — لا تُنشئ نسخة مكررة inline في
 * أي Component آخر (كان الشعار مكررًا سابقًا بلا توحيد في 3 أماكن منفصلة: التسويق،
 * القائمة الجانبية، ولوحة الأدمن).
 */
export function Logo({ variant = "full", theme = "auto", href = "/", size = "md", className }: LogoProps) {
  const { mark, text } = SIZE_CLASSES[size];
  const textClass = theme === "light" ? "text-white" : "text-foreground";

  const content = (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className={cn(mark, "shrink-0")} />
      {variant === "full" && <span className={cn("font-heading font-extrabold tracking-tight", text, textClass)}>مخزني</span>}
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} className="flex w-fit items-center">
      {content}
    </Link>
  );
}
