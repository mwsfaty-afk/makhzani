import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = Number(url.searchParams.get("paymentId"));

  if (paymentId) {
    await prisma.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: { status: "FAILED", rejectionReason: "ألغى العميل عملية الدفع عبر PayPal" },
    });
  }

  return NextResponse.redirect(`${url.origin}/dashboard/billing?paypal=cancelled`);
}
