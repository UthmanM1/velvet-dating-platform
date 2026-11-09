"use server";

import { revalidatePath } from "next/cache";
import type { Tier } from "@/lib/types";
import * as admin from "@/server/services/admin";
import { requireAdmin } from "@/server/session";

export async function accountStatusAction(fd: FormData): Promise<void> {
  const a = await requireAdmin();
  const status = String(fd.get("status"));
  if (!["active", "suspended", "banned"].includes(status)) return;
  await admin.setAccountStatus(a, String(fd.get("userId")), status as "active" | "suspended" | "banned", String(fd.get("note") ?? ""));
  revalidatePath("/admin", "layout");
}

export async function verifyProfileAction(fd: FormData): Promise<void> {
  const a = await requireAdmin();
  await admin.setProfileVerified(a, String(fd.get("userId")), fd.get("verified") === "1");
  revalidatePath("/admin", "layout");
}

export async function hideProfileAction(fd: FormData): Promise<void> {
  const a = await requireAdmin();
  await admin.setProfileHidden(a, String(fd.get("userId")), fd.get("hidden") === "1");
  revalidatePath("/admin", "layout");
}

export async function resolveReportAction(fd: FormData): Promise<void> {
  const a = await requireAdmin();
  const outcome = fd.get("outcome") === "dismissed" ? "dismissed" : "resolved";
  await admin.resolveReport(a, String(fd.get("reportId")), outcome);
  revalidatePath("/admin", "layout");
}

export async function photoDecisionAction(fd: FormData): Promise<void> {
  const a = await requireAdmin();
  const decision = fd.get("decision") === "rejected" ? "rejected" : "approved";
  await admin.moderatePhoto(a, String(fd.get("userId")), String(fd.get("photoId")), decision);
  revalidatePath("/admin", "layout");
}

export async function adminTierAction(fd: FormData): Promise<void> {
  const a = await requireAdmin();
  const tier = String(fd.get("tier"));
  if (!["silver", "gold", "platinum"].includes(tier)) return;
  await admin.adminSetTier(a, String(fd.get("userId")), tier as Tier);
  revalidatePath("/admin", "layout");
}
