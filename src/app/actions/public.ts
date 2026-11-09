"use server";

import { redirect } from "next/navigation";
import { consume } from "@/lib/rate-limit";
import { contactSchema, fieldErrors, loginSchema, registerSchema, resetRequestSchema, resetSchema } from "@/lib/validation";
import { log } from "@/lib/log";
import { authenticate, registerMember, requestPasswordReset, resetPassword, type ActionResult } from "@/server/services/auth";
import { clientIp, endSession, startSession } from "@/server/session";

export type ActionState = ActionResult | null;

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    displayName: fd.get("displayName"),
    email: fd.get("email"),
    password: fd.get("password"),
    dob: fd.get("dob"),
    gender: fd.get("gender"),
    interestedIn: fd.getAll("interestedIn"),
    city: fd.get("city"),
    intention: fd.get("intention"),
    bio: fd.get("bio"),
    confirmAge: fd.get("confirmAge") === "on",
    acceptTerms: fd.get("acceptTerms") === "on",
    marketingConsent: fd.get("marketingConsent") === "on",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  return registerMember(parsed.data, await clientIp());
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, message: "Enter your email and password." };
  const res = await authenticate(parsed.data.email, parsed.data.password, await clientIp());
  if (!res.ok) return { ok: false, message: res.message };
  await startSession(res.user);
  redirect(res.user.role === "admin" ? "/admin" : "/dashboard");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}

export async function forgotAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = resetRequestSchema.safeParse({ email: fd.get("email") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  return requestPasswordReset(parsed.data.email, await clientIp());
}

export async function resetAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = resetSchema.safeParse({ token: fd.get("token"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  return resetPassword(parsed.data.token, parsed.data.password);
}

export async function contactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = contactSchema.safeParse({ name: fd.get("name"), email: fd.get("email"), message: fd.get("message") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  if (!consume(`contact:${await clientIp()}`, 5, 60 * 60_000).allowed) return { ok: false, message: "Too many messages. Please try again later." };
  // No support inbox is wired up yet: record only that a message arrived (no personal content in logs).
  log("contact.received");
  return { ok: true, message: "Thank you. Your message has been received. (Demo mode: no support inbox is connected yet.)" };
}
