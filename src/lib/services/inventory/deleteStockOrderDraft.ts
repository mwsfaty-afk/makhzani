import { prisma } from "@/lib/db/prisma";

/**
 * حذف أمر توريد/صرف بحالة Draft فقط — لا أثر مخزون بعد لحذفه (لم يُعتمَد بعد). لا يوجد
 * "إلغاء بعد الاعتماد" لهذه الأوامر في هذه المرحلة (نفس غياب أي تراجع في الفورم السريع
 * الحالي لتسوية المخزون) — نطاق مؤجَّل عمدًا.
 */
export async function deleteStockOrderDraft(companyId: number, orderId: number) {
  const order = await prisma.stockAdjustment.findFirst({ where: { id: orderId, companyId } });
  if (!order) throw new Error("الأمر غير موجود");
  if (order.status !== "DRAFT") throw new Error("لا يمكن حذف أمر تم اعتماده بالفعل");

  await prisma.$transaction([
    prisma.stockAdjustmentItem.deleteMany({ where: { stockAdjustmentId: orderId } }),
    prisma.stockAdjustment.delete({ where: { id: orderId } }),
  ]);
}
