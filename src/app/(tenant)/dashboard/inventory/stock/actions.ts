"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenant } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";
import { recordStockMovement, InsufficientStockError } from "@/lib/services/inventory/stockMovement";
import { nextDocumentNumber } from "@/lib/services/documentNumbering";
import { assertSubscriptionActive, SubscriptionExpiredError } from "@/lib/services/billing/subscriptionGuard";
import { IN_REASONS, OUT_REASONS, movementTypeForAdjustment } from "@/lib/services/inventory/adjustmentReasons";

const schema = z.object({
  itemId: z.coerce.number().int().positive(),
  warehouseId: z.coerce.number().int().positive(),
  direction: z.enum(["IN", "OUT"]),
  qty: z.coerce.number().positive("الكمية يجب أن تكون أكبر من صفر"),
  unitCost: z.coerce.number().min(0).optional(),
  reason: z.string().min(1),
  notes: z.string().optional(),
  expiryDate: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
});

export async function adjustStock(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "stock_adjustments.create");
  if (denied) return denied;
  const { companyId, userId } = ctx;

  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (d.direction === "IN" && !IN_REASONS.includes(d.reason as (typeof IN_REASONS)[number])) {
    return { error: "سبب غير صحيح" };
  }
  if (d.direction === "OUT" && !OUT_REASONS.includes(d.reason as (typeof OUT_REASONS)[number])) {
    return { error: "سبب غير صحيح" };
  }
  if (d.direction === "IN" && d.unitCost === undefined) {
    return { error: "تكلفة الوحدة مطلوبة عند الإضافة" };
  }

  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const docType = d.direction === "IN" ? "stock_in" : "stock_out";
  const movementType = movementTypeForAdjustment(d.direction, d.reason);

  try {
    await assertSubscriptionActive(companyId);
    await prisma.$transaction(async (tx) => {
      const docNo = await nextDocumentNumber(tx, companyId, docType);
      const now = new Date();

      const adjustment = await tx.stockAdjustment.create({
        data: {
          companyId,
          docNo,
          date: now,
          warehouseId: d.warehouseId,
          reason: d.reason,
          direction: d.direction,
          status: "POSTED",
          userId,
          postedAt: now,
        } as never,
      });

      await tx.stockAdjustmentItem.create({
        data: {
          stockAdjustmentId: adjustment.id,
          itemId: d.itemId,
          qty: d.qty,
          unitCost: d.direction === "IN" ? d.unitCost! : 0,
          expiryDate: d.direction === "IN" ? d.expiryDate : undefined,
        } as never,
      });

      await recordStockMovement(tx, {
        companyId,
        itemId: d.itemId,
        warehouseId: d.warehouseId,
        movementDate: now,
        movementType,
        documentType: docType,
        documentId: adjustment.id,
        documentNo: docNo,
        userId,
        notes: d.notes,
        allowNegativeStock: company.allowNegativeStock,
        expiryDate: d.direction === "IN" ? d.expiryDate : undefined,
        ...(d.direction === "IN" ? { qtyIn: d.qty, unitCost: d.unitCost! } : { qtyOut: d.qty }),
      } as never);

      await tx.auditLog.create({
        data: {
          companyId,
          userId,
          action: "create",
          module: "stock",
          tableName: "stock_adjustments",
          recordId: adjustment.id,
          newValue: { docNo, direction: d.direction, reason: d.reason, itemId: d.itemId, qty: d.qty },
        },
      });
    }, { timeout: 15000 });
  } catch (err) {
    if (err instanceof InsufficientStockError || err instanceof SubscriptionExpiredError) return { error: err.message };
    return { error: "حدث خطأ أثناء حفظ الحركة" };
  }

  revalidatePath("/dashboard/inventory/stock");
  return { success: true };
}
