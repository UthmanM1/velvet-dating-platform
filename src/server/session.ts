import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { config } from "@/lib/config";
import { hashToken, signSession, verifySession } from "@/lib/security";
import type { User } from "@/lib/types";
import { getStore } from "./store";

const COOKIE = "velvet_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function credentialVersion(user: User): string {
  return hashToken(user.passwordHash).slice(0, 12);
}

export async function startSession(user: User): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, signSession({ uid: user.id, exp: Date.now() + MAX_AGE_SEC * 1000, sv: credentialVersion(user) }), {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Resolves the signed-in, active user or null. Suspended/banned accounts are treated as signed out. */
export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const payload = verifySession(jar.get(COOKIE)?.value);
  if (!payload) return null;
  const store = await getStore();
  const user = store.users.get(payload.uid);
  if (!user || user.status !== "active") return null;
  if (payload.sv !== credentialVersion(user)) return null;
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Role check happens server-side on every call; the UI hiding admin links is cosmetic only. */
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Same-origin check for cookie-authenticated mutation routes (defence in depth beside SameSite=Lax). */
export async function assertSameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return true; // non-browser or same-origin GET-like navigation
  const host = h.get("x-forwarded-host") ?? h.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
