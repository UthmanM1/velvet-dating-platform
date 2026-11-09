"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consume } from "@/lib/rate-limit";
import type { Tier } from "@/lib/types";
import { fieldErrors, passwordSchema, privacySchema, profileUpdateSchema, reportSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/security";
import { changePassword, type ActionResult } from "@/server/services/auth";
import { cancelSubscription, changePlan, resumeSubscription } from "@/server/services/billing";
import * as members from "@/server/services/members";
import { assertSameOrigin, clientIp, endSession, requireUser, startSession } from "@/server/session";
import { headers } from "next/headers";

type State = ActionResult | null;

export async function updateProfileAction(_: State, fd: FormData): Promise<State> {
  const user = await requireUser();
  const parsed = profileUpdateSchema.safeParse({
    displayName: fd.get("displayName"), city: fd.get("city"), intention: fd.get("intention"), bio: fd.get("bio"),
    interestedIn: fd.getAll("interestedIn"), interests: fd.getAll("interests"),
    relationshipPreferences: fd.get("relationshipPreferences") ?? "", smoking: fd.get("smoking"), drinking: fd.get("drinking"),
    children: fd.get("children"), fitness: fd.get("fitness"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  await members.updateProfile(user.id, parsed.data);
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function updatePrivacyAction(_: State, fd: FormData): Promise<State> {
  const user = await requireUser();
  const parsed = privacySchema.safeParse({
    visibility: fd.get("visibility"), showOnline: fd.get("showOnline") === "on", showDistance: fd.get("showDistance") === "on",
    incognito: fd.get("incognito") === "on", marketingConsent: fd.get("marketingConsent") === "on", analyticsConsent: fd.get("analyticsConsent") === "on",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const res = await members.updatePrivacy(user, parsed.data);
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: res.incognitoBlocked ? "Saved. Incognito browsing is a Platinum feature, so it was left off." : "Privacy settings saved." };
}

export async function changePasswordAction(_: State, fd: FormData): Promise<State> {
  const user = await requireUser();
  if (!consume(`pwchange:${user.id}`, 5, 15 * 60_000).allowed) return { ok: false, message: "Too many attempts. Try again later." };
  const next = passwordSchema.safeParse(fd.get("next"));
  if (!next.success) return { ok: false, errors: { next: next.error.issues[0].message } };
  const res = await changePassword(user, String(fd.get("current") ?? ""), next.data);
  if (res.ok) await startSession(user); // credential version changed: keep this device signed in
  return res;
}

export async function uploadPhotoAction(_: State, fd: FormData): Promise<State> {
  const user = await requireUser();
  const file = fd.get("photo");
  if (!(file instanceof File)) return { ok: false, message: "Choose an image to upload." };
  const res = await members.addPhoto(user, file);
  revalidatePath("/dashboard/profile");
  return res;
}

export async function removePhotoAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  await members.removePhoto(user.id, String(fd.get("photoId")));
  revalidatePath("/dashboard/profile");
}

export async function primaryPhotoAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  await members.setPrimaryPhoto(user.id, String(fd.get("photoId")));
  revalidatePath("/dashboard/profile");
}

export async function favouriteAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  await members.toggleFavourite(user, String(fd.get("targetId")));
  revalidatePath("/discover", "layout");
  revalidatePath("/dashboard", "layout");
}

export async function interestAction(_: State, fd: FormData): Promise<State> {
  const user = await requireUser();
  const res = await members.sendInterest(user, String(fd.get("targetId")));
  revalidatePath("/dashboard", "layout");
  return res;
}

export async function blockAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  await members.blockMember(user, String(fd.get("targetId")));
  revalidatePath("/", "layout");
  redirect("/discover");
}

export async function unblockAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  await members.unblockMember(user, String(fd.get("targetId")));
  revalidatePath("/dashboard/privacy");
}

export async function reportAction(_: State, fd: FormData): Promise<State> {
  const user = await requireUser();
  const parsed = reportSchema.safeParse({ targetId: fd.get("targetId"), reason: fd.get("reason"), details: fd.get("details") ?? "" });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "Choose a reason." };
  if (!consume(`report:${user.id}`, 10, 60 * 60_000).allowed) return { ok: false, message: "Too many reports. Try again later." };
  return members.reportMember(user, parsed.data);
}

export async function markNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  await members.markNotificationsRead(user.id);
  revalidatePath("/dashboard", "layout");
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function changePlanAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const tier = String(fd.get("tier")) as Tier;
  if (!["silver", "gold", "platinum"].includes(tier)) redirect("/dashboard/subscription");
  let res;
  try {
    res = await changePlan(user, tier, await origin());
  } catch {
    redirect("/dashboard/subscription?error=" + encodeURIComponent("Billing is temporarily unavailable."));
  }
  if (res.redirectUrl) redirect(res.redirectUrl);
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/subscription?${res.ok ? "notice" : "error"}=${encodeURIComponent(res.message)}`);
}

export async function cancelSubscriptionAction(): Promise<void> {
  const user = await requireUser();
  const res = await cancelSubscription(user);
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/subscription?${res.ok ? "notice" : "error"}=${encodeURIComponent(res.message)}`);
}

export async function resumeSubscriptionAction(): Promise<void> {
  const user = await requireUser();
  const res = await resumeSubscription(user);
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/subscription?${res.ok ? "notice" : "error"}=${encodeURIComponent(res.message)}`);
}

export async function deleteAccountAction(_: State, fd: FormData): Promise<State> {
  const user = await requireUser();
  if (user.isDemo) return { ok: false, message: "The shared demo account can't be deleted. Register your own account to try this." };
  if (!(await assertSameOrigin())) return { ok: false, message: "Request blocked." };
  if (fd.get("confirm") !== "DELETE") return { ok: false, message: "Type DELETE to confirm." };
  if (!consume(`delete:${await clientIp()}`, 5, 60 * 60_000).allowed) return { ok: false, message: "Too many attempts." };
  if (!(await verifyPassword(String(fd.get("password") ?? ""), user.passwordHash))) return { ok: false, errors: { password: "Password is incorrect." } };
  await members.deleteAccount(user);
  await endSession();
  redirect("/?deleted=1");
}
