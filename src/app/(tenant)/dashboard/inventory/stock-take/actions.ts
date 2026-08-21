"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/auth/session";
import { createStockTake } from "@/lib/services/inventory/createStockTake";
import { postStockTake } from "@/lib/services/inventory/postStockTake";

export async function createStockTakeAction(formData: FormData) {
  const { companyId, userId } = await requireTenant();
  const warehouseId = Number(formData.get("warehouseId"));

  let stockTakeId: number;
  try {
    const stockTake = await createStockTake({ companyId, userId, warehouseId });
    stockTakeId = stockTake.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "حدث خطأ أثناء تجهيز الجرد" };
  }

  revalidatePath("/dashboard/inventory/stock-take");
  redirect(`/dashboard/inventory/stock-take/${stockTakeId}`);
}

export async function postStockTakeAction(stockTakeId: number, formData: FormData) {
  const { companyId, userId } = await requireTenant();

  const counts = JSON.parse(String(formData.get("countsJson") ?? "[]")) as {
    stockTakeItemId: number;
    actualQty: number;
  }[];

  try {
    await postStockTake(companyId, stockTakeId, userId, counts);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "حدث خطأ أثناء اعتماد الجرد" };
  }

  revalidatePath(`/dashboard/inventory/stock-take/${stockTakeId}`);
  revalidatePath("/dashboard/inventory/stock-take");
  revalidatePath("/dashboard/inventory/stock");
  redirect(`/dashboard/inventory/stock-take/${stockTakeId}`);
}
