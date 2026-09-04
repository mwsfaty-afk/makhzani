import type { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export function LegalLayout({ title, updatedAt, children }: { title: string; updatedAt: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:px-6">
        <h1 className="text-3xl font-bold text-balance">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">آخر تحديث: {updatedAt}</p>
        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:ps-5 [&_li]:mt-1 [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
          {children}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
