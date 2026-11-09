import { config } from "@/lib/config";
import { log, pseudonym } from "@/lib/log";
import { consume } from "@/lib/rate-limit";
import { hashPassword, hashToken, newToken, verifyPassword } from "@/lib/security";
import type { User } from "@/lib/types";
import { cleanText, uid } from "@/lib/utils";
import type { RegisterInput } from "@/lib/validation";
import { getAgeVerification, getEmail } from "../adapters";
import { getStore } from "../store";

const DAY = 86_400_000;
const emailInDemoMode = () => getEmail().name === "demo-outbox";

export interface ActionResult {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Demo mode only: transactional email is not delivered, so the link is shown to the requester. */
  demoLink?: string;
}

async function issueToken(userId: string, purpose: "verify_email" | "reset_password", ttlMs: number) {
  const store = await getStore();
  const { token, hash } = newToken();
  store.tokens.set(hash, { hash, userId, purpose, expiresAt: Date.now() + ttlMs });
  return token;
}

export async function registerMember(input: RegisterInput, ip: string): Promise<ActionResult> {
  const rl = consume(`register:${ip}`, 8, 60 * 60_000);
  if (!rl.allowed) return { ok: false, message: "Too many attempts. Please try again later." };

  const store = await getStore();
  const email = input.email.toLowerCase();
  const generic: ActionResult = {
    ok: true,
    message: "Check your inbox for a verification link to activate your account.",
  };
  const existing = [...store.users.values()].find((u) => u.email === email);
  if (existing) {
    // Do not reveal that the address is registered.
    log("register.duplicate", { who: pseudonym(email) });
    return generic;
  }

  const age = await getAgeVerification().start("pending");
  const now = new Date().toISOString();
  const id = uid("usr_");
  const user: User = {
    id,
    email,
    passwordHash: await hashPassword(input.password),
    role: "member",
    status: "pending_verification",
    emailVerified: false,
    createdAt: now,
    isDemo: false,
    consents: [
      { type: "terms", granted: true, at: now },
      { type: "privacy", granted: true, at: now },
      { type: "age_confirmation", granted: true, at: now },
      { type: "marketing", granted: input.marketingConsent, at: now },
    ],
    ageVerification: { status: age.status },
  };
  store.users.set(id, user);
  store.profiles.set(id, {
    userId: id,
    displayName: cleanText(input.displayName, 30),
    dob: input.dob,
    gender: input.gender,
    interestedIn: input.interestedIn,
    city: input.city,
    intention: input.intention,
    bio: cleanText(input.bio, 600),
    interests: [],
    relationshipPreferences: "",
    lifestyle: { smoking: "never", drinking: "socially", children: "open", fitness: "weekly" },
    photos: [],
    visibility: "members",
    incognito: false,
    showOnline: true,
    showDistance: true,
    verified: false,
    lastActiveAt: now,
    createdAt: now,
  });
  store.subscriptions.set(id, {
    userId: id,
    tier: "silver",
    status: "active",
    provider: "demo",
    currentPeriodEnd: new Date(Date.now() + 30 * DAY).toISOString(),
    cancelAtPeriodEnd: false,
  });

  const token = await issueToken(id, "verify_email", 24 * 3_600_000);
  const link = `${config.siteUrl}/verify-email?token=${token}`;
  await getEmail().send({ to: email, subject: "Verify your VELVET account", body: "Confirm your email address to activate your account.", link });
  log("register.ok", { who: pseudonym(email) });
  return { ...generic, demoLink: emailInDemoMode() ? link : undefined };
}

export async function verifyEmailToken(token: string): Promise<ActionResult> {
  const store = await getStore();
  const rec = store.tokens.get(hashToken(token));
  if (!rec || rec.purpose !== "verify_email" || rec.expiresAt < Date.now()) {
    return { ok: false, message: "This verification link is invalid or has expired." };
  }
  const user = store.users.get(rec.userId);
  if (!user) return { ok: false, message: "This verification link is invalid or has expired." };
  user.emailVerified = true;
  if (user.status === "pending_verification") user.status = "active";
  store.tokens.delete(rec.hash);
  store.notifications.unshift({
    id: uid("n_"), userId: user.id, type: "system", title: "Welcome to VELVET",
    body: "Complete your profile and add a photo to start appearing in discovery.", href: "/dashboard/profile",
    read: false, createdAt: new Date().toISOString(),
  });
  return { ok: true, message: "Email verified. You can now sign in." };
}

export async function authenticate(
  emailRaw: string,
  password: string,
  ip: string,
): Promise<{ ok: true; user: User } | { ok: false; message: string }> {
  const email = emailRaw.toLowerCase();
  const rl = consume(`login:${ip}:${email}`, 8, 15 * 60_000);
  const rlIp = consume(`login-ip:${ip}`, 40, 15 * 60_000);
  if (!rl.allowed || !rlIp.allowed) return { ok: false, message: "Too many sign-in attempts. Please wait a few minutes." };

  const store = await getStore();
  const user = [...store.users.values()].find((u) => u.email === email);
  // Always run a hash comparison so timing doesn't reveal whether the account exists.
  const valid = await verifyPassword(password, user?.passwordHash ?? "scrypt$00$00");
  const fail = { ok: false as const, message: "Incorrect email or password." };
  if (!user || !valid) return fail;
  if (user.status === "banned") return { ok: false, message: "This account has been closed." };
  if (user.status === "suspended") return { ok: false, message: "This account is suspended. Contact support for details." };
  if (!user.emailVerified || user.status === "pending_verification")
    return { ok: false, message: "Please verify your email address before signing in." };
  user.lastLoginAt = new Date().toISOString();
  const profile = store.profiles.get(user.id);
  if (profile) profile.lastActiveAt = user.lastLoginAt;
  log("login.ok", { who: pseudonym(user.id) });
  return { ok: true, user };
}

export async function requestPasswordReset(emailRaw: string, ip: string): Promise<ActionResult> {
  const rl = consume(`reset:${ip}`, 5, 60 * 60_000);
  const generic: ActionResult = { ok: true, message: "If an account exists for that address, a reset link is on its way." };
  if (!rl.allowed) return { ok: false, message: "Too many requests. Please try again later." };
  const store = await getStore();
  const email = emailRaw.toLowerCase();
  const user = [...store.users.values()].find((u) => u.email === email);
  if (!user || user.status === "banned") return generic;
  const token = await issueToken(user.id, "reset_password", 60 * 60_000);
  const link = `${config.siteUrl}/reset-password?token=${token}`;
  await getEmail().send({ to: email, subject: "Reset your VELVET password", body: "Use the link to choose a new password.", link });
  // Demo-mode links are only ever shown for self-registered accounts, never seeded demo or admin accounts.
  const showLink = emailInDemoMode() && !user.isDemo && user.role === "member";
  return { ...generic, demoLink: showLink ? link : undefined };
}

export async function resetPassword(token: string, password: string): Promise<ActionResult> {
  const store = await getStore();
  const rec = store.tokens.get(hashToken(token));
  if (!rec || rec.purpose !== "reset_password" || rec.expiresAt < Date.now()) {
    return { ok: false, message: "This reset link is invalid or has expired." };
  }
  const user = store.users.get(rec.userId);
  if (!user) return { ok: false, message: "This reset link is invalid or has expired." };
  user.passwordHash = await hashPassword(password);
  store.tokens.delete(rec.hash);
  return { ok: true, message: "Password updated. You can now sign in." };
}

export async function changePassword(user: User, current: string, next: string): Promise<ActionResult> {
  if (!(await verifyPassword(current, user.passwordHash))) return { ok: false, errors: { current: "Current password is incorrect." } };
  user.passwordHash = await hashPassword(next);
  return { ok: true, message: "Password changed." };
}
