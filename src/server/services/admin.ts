import { getPlans } from "@/lib/plans";
import type { AuditLog, Tier, User } from "@/lib/types";
import { ageFromDob, uid } from "@/lib/utils";
import { getStorage } from "../adapters";
import { getStore, type Store } from "../store";
import { currentSubscription, tierOf } from "./billing";

function audit(store: Store, admin: User, action: string, targetType: AuditLog["targetType"], targetId: string, detail: string) {
  store.audit.unshift({ id: uid("aud_"), adminId: admin.id, action, targetType, targetId, detail, at: new Date().toISOString() });
}

/** Every admin service re-checks the role itself, so a missed UI guard can never expose these actions. */
function assertAdmin(admin: User) {
  if (admin.role !== "admin" || admin.status !== "active") throw new Error("Forbidden");
}

export async function analytics(admin: User) {
  assertAdmin(admin);
  const store = await getStore();
  const members = [...store.users.values()].filter((u) => u.role === "member");
  const byTier: Record<Tier, number> = { silver: 0, gold: 0, platinum: 0 };
  let mrrPence = 0;
  const prices = Object.fromEntries(getPlans().map((p) => [p.tier, p.pricePence])) as Record<Tier, number>;
  for (const m of members) {
    const t = tierOf(store, m.id);
    byTier[t]++;
    const sub = currentSubscription(store, m.id);
    if (sub.status === "active") mrrPence += prices[t];
  }
  const day = 86_400_000;
  const byMonth = new Map<string, number>();
  for (const p of store.payments.filter((x) => x.status === "succeeded")) {
    const k = p.createdAt.slice(0, 7);
    byMonth.set(k, (byMonth.get(k) ?? 0) + p.amountPence);
  }
  return {
    totalMembers: members.length,
    realMembers: members.filter((m) => !m.isDemo).length,
    demoMembers: members.filter((m) => m.isDemo).length,
    active: members.filter((m) => m.status === "active").length,
    suspended: members.filter((m) => m.status === "suspended").length,
    banned: members.filter((m) => m.status === "banned").length,
    newThisWeek: members.filter((m) => Date.now() - new Date(m.createdAt).getTime() < 7 * day).length,
    verifiedProfiles: [...store.profiles.values()].filter((p) => p.verified && store.users.get(p.userId)?.role === "member").length,
    openReports: store.reports.filter((r) => r.status === "open").length,
    pendingPhotos: [...store.profiles.values()].reduce((n, p) => n + p.photos.filter((x) => x.status === "pending").length, 0),
    messages: store.messages.length,
    byTier,
    mrrPence,
    totalRevenuePence: store.payments.filter((p) => p.status === "succeeded").reduce((n, p) => n + p.amountPence, 0),
    revenueByMonth: [...byMonth.entries()].sort().slice(-6),
  };
}

export async function listMembers(admin: User, query: string) {
  assertAdmin(admin);
  const store = await getStore();
  const q = query.trim().toLowerCase();
  return [...store.users.values()]
    .filter((u) => u.role === "member")
    .map((u) => {
      const p = store.profiles.get(u.id);
      return { id: u.id, email: u.email, status: u.status, isDemo: u.isDemo, name: p?.displayName ?? "?", age: p ? ageFromDob(p.dob) : 0, city: p?.city ?? "", verified: Boolean(p?.verified), tier: tierOf(store, u.id), createdAt: u.createdAt, note: u.moderationNote };
    })
    .filter((m) => !q || m.email.includes(q) || m.name.toLowerCase().includes(q) || m.id.includes(q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
}

export async function setAccountStatus(admin: User, userId: string, status: "active" | "suspended" | "banned", note: string) {
  assertAdmin(admin);
  const store = await getStore();
  const u = store.users.get(userId);
  if (!u || u.role === "admin") return { ok: false, message: "Account not found." };
  u.status = status;
  u.moderationNote = note.slice(0, 300) || undefined;
  audit(store, admin, `user.${status === "active" ? "reinstate" : status === "suspended" ? "suspend" : "ban"}`, "user", userId, note.slice(0, 300) || "No note");
  return { ok: true, message: `Account ${status}.` };
}

export async function setProfileVerified(admin: User, userId: string, verified: boolean) {
  assertAdmin(admin);
  const store = await getStore();
  const p = store.profiles.get(userId);
  if (!p) return;
  p.verified = verified;
  audit(store, admin, verified ? "profile.verify" : "profile.unverify", "user", userId, verified ? "Verification badge granted" : "Verification badge removed");
}

export async function setProfileHidden(admin: User, userId: string, hidden: boolean) {
  assertAdmin(admin);
  const store = await getStore();
  const p = store.profiles.get(userId);
  if (!p) return;
  p.visibility = hidden ? "hidden" : "members";
  audit(store, admin, hidden ? "profile.hide" : "profile.unhide", "user", userId, "Moderation visibility change");
}

export async function listReports(admin: User) {
  assertAdmin(admin);
  const store = await getStore();
  return store.reports.map((r) => ({
    ...r,
    reporterName: store.profiles.get(r.reporterId)?.displayName ?? "Deleted member",
    targetName: store.profiles.get(r.targetId)?.displayName ?? "Deleted member",
    targetStatus: store.users.get(r.targetId)?.status ?? "banned",
  })).sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === "open" ? -1 : 1));
}

export async function resolveReport(admin: User, reportId: string, outcome: "resolved" | "dismissed") {
  assertAdmin(admin);
  const store = await getStore();
  const r = store.reports.find((x) => x.id === reportId);
  if (!r) return;
  r.status = outcome;
  r.resolvedBy = admin.id;
  r.resolvedAt = new Date().toISOString();
  audit(store, admin, `report.${outcome}`, "report", reportId, `Report against ${r.targetId}`);
}

export async function listPendingPhotos(admin: User) {
  assertAdmin(admin);
  const store = await getStore();
  return [...store.profiles.values()].flatMap((p) => p.photos.filter((ph) => ph.status === "pending").map((ph) => ({ photoId: ph.id, userId: p.userId, name: p.displayName, url: ph.url, createdAt: ph.createdAt })));
}

export async function moderatePhoto(admin: User, userId: string, photoId: string, decision: "approved" | "rejected") {
  assertAdmin(admin);
  const store = await getStore();
  const p = store.profiles.get(userId);
  const ph = p?.photos.find((x) => x.id === photoId);
  if (!p || !ph) return;
  ph.status = decision;
  if (decision === "rejected") {
    ph.isPrimary = false;
    if (ph.path) await getStorage().remove(ph.path);
    if (!p.photos.some((x) => x.isPrimary && x.status !== "rejected")) {
      const next = p.photos.find((x) => x.status === "approved");
      if (next) next.isPrimary = true;
    }
  }
  store.notifications.unshift({ id: uid("n_"), userId, type: "moderation", title: decision === "approved" ? "Your photo was approved" : "Your photo was not approved", body: decision === "approved" ? "It is now visible to other members." : "It breaches our community guidelines. Please upload a different photo.", href: "/dashboard/profile", read: false, createdAt: new Date().toISOString() });
  audit(store, admin, `photo.${decision}`, "photo", photoId, `Photo for ${userId}`);
}

export async function listSubscriptions(admin: User) {
  assertAdmin(admin);
  const store = await getStore();
  return [...store.users.values()].filter((u) => u.role === "member").map((u) => {
    const s = currentSubscription(store, u.id);
    return { ...s, name: store.profiles.get(u.id)?.displayName ?? "?", email: u.email, isDemo: u.isDemo };
  }).sort((a, b) => b.currentPeriodEnd.localeCompare(a.currentPeriodEnd)).slice(0, 100);
}

export async function adminSetTier(admin: User, userId: string, tier: Tier) {
  assertAdmin(admin);
  const store = await getStore();
  if (!store.users.has(userId)) return;
  const sub = currentSubscription(store, userId);
  const from = sub.tier;
  sub.tier = tier;
  sub.pendingTier = undefined;
  sub.cancelAtPeriodEnd = false;
  audit(store, admin, "subscription.set_tier", "subscription", userId, `${from} -> ${tier} (manual, no payment taken)`);
}

export async function listAudit(admin: User) {
  assertAdmin(admin);
  const store = await getStore();
  return store.audit.slice(0, 200);
}
