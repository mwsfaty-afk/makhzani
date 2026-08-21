import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

/** يعرض إثبات الدفع المخزَّن داخل القاعدة مباشرة (Bytes) — بدون تخزين خارجي عام، لأنه
 * مستند مالي حساس. مسموح فقط لأدمن المنصة، أو الشركة صاحبة الدفعة نفسها. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paymentId = Number(id);
  if (!paymentId) return NextResponse.json({ error: "not found" }, { status: 404 });

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || !payment.proofData) return NextResponse.json({ error: "not found" }, { status: 404 });

  const tenantSession = await getServerSession(authOptions);
  const isOwningCompany = tenantSession?.user?.companyId === payment.companyId;

  let isPlatformAdmin = false;
  if (!isOwningCompany) {
    const cookieStore = await cookies();
    const token = cookieStore.get("makhzani_admin_session")?.value;
    const secret = process.env.NEXTAUTH_SECRET;
    if (token && secret) {
      try {
        const decoded = await decode({ token, secret });
        isPlatformAdmin = Boolean((decoded as { adminId?: number } | null)?.adminId);
      } catch {
        isPlatformAdmin = false;
      }
    }
  }

  if (!isOwningCompany && !isPlatformAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return new NextResponse(new Uint8Array(payment.proofData), {
    headers: {
      "Content-Type": payment.proofMimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${payment.proofFileName ?? "proof"}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
