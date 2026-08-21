"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/auth/session";
import { createStockTransfer, type CreateStockTransferLine } from "@/lib/services/inventory/createStockTransfer";

export async function createStockTransferAction(formData: FormData) {
  const { companyId, userId } = await requireTenant();

  const fromWarehouseId = Number(formData.get("fromWarehouseId"));
  const toWarehouseId = Number(formData.get("toWarehouseId"));
  const notes = String(formData.get("notes") ?? "") || undefined;
  const lines = JSON.parse(String(formData.get("linesJson") ?? "[]")) as CreateStockTransferLine[];

  try {
    await createStockTransfer({ companyId, userId, fromWarehouseId, toWarehouseId, notes, lines });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "حدث خطأ أثناء حفظ التحويل" };
  }

  revalidatePath("/dashboard/inventory/transfers");
  revalidatePath("/dashboard/inventory/stock");
  redirect("/dashboard/inventory/transfers");
}
