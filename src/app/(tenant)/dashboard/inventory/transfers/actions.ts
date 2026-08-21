"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";
import { toUserErrorMessage } from "@/lib/errors";
import { createStockTransfer, type CreateStockTransferLine } from "@/lib/services/inventory/createStockTransfer";

export async function createStockTransferAction(formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "stock_transfers.create");
  if (denied) return denied;
  const { companyId, userId } = ctx;

  const fromWarehouseId = Number(formData.get("fromWarehouseId"));
  const toWarehouseId = Number(formData.get("toWarehouseId"));
  const notes = String(formData.get("notes") ?? "") || undefined;
  const lines = JSON.parse(String(formData.get("linesJson") ?? "[]")) as CreateStockTransferLine[];

  try {
    await createStockTransfer({ companyId, userId, fromWarehouseId, toWarehouseId, notes, lines });
  } catch (err) {
    return { error: toUserErrorMessage(err, "حدث خطأ أثناء حفظ التحويل") };
  }

  revalidatePath("/dashboard/inventory/transfers");
  revalidatePath("/dashboard/inventory/stock");
  redirect("/dashboard/inventory/transfers");
}
