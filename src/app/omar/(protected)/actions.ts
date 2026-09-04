"use server";

import { redirect } from "next/navigation";
import { destroyAdminSession } from "@/lib/auth/adminSession";

export async function adminLogoutAction() {
  await destroyAdminSession();
  redirect("/omar/login");
}
