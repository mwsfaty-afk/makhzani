import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * فحص يومي (docs/ARCHITECTURE.md §8.5): أي اشتراك TRIALING/ACTIVE تجاوز currentPeriodEnd
 * يتحول إلى EXPIRED. هذا فحص إضافي احترازي فقط — assertSubscriptionActive() يفحص
 * ويُصحّح نفس الحالة لحظيًا (Lazy Expiry) عند أي كتابة، فلا يعتمد منع الكتابة على تشغيل
 * هذا الـ Cron فعليًا، لكنه يبقي حالة الاشتراكات صحيحة حتى للشركات غير النشطة تمامًا.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const result = await prisma.subscription.updateMany({
    where: { status: { in: ["TRIALING", "ACTIVE"] }, currentPeriodEnd: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });

  return NextResponse.json({ expired: result.count });
}
