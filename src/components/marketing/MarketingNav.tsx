import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const NAV_LINKS = [
  { href: "#features", label: "المميزات" },
  { href: "#how-it-works", label: "كيف يعمل" },
  { href: "#pricing", label: "الباقات" },
  { href: "#faq", label: "الأسئلة الشائعة" },
];

/**
 * بدون أي JavaScript على الإطلاق — قائمة الموبايل تعتمد على `<details>/<summary>` الأصلي
 * في المتصفح (Disclosure Widget بدعم إمكانية وصول مدمج)، وليس State/useState أو مكتبة.
 */
export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            ابدأ مجانًا
          </Link>
        </div>

        <details className="group md:hidden">
          <summary
            className="flex size-10 cursor-pointer list-none items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="فتح القائمة"
          >
            <svg viewBox="0 0 24 24" className="size-5 group-open:hidden" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg viewBox="0 0 24 24" className="hidden size-5 group-open:block" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </summary>

          <nav className="absolute inset-x-0 top-full flex flex-col gap-1 border-b border-border bg-background p-4 shadow-lg">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <Link href="/login" className="rounded-lg px-3 py-2.5 text-center text-sm font-semibold hover:bg-muted">
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
              >
                ابدأ مجانًا
              </Link>
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}
