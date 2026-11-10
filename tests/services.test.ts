import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { discoverQuerySchema } from "@/lib/validation";
import { authenticate, registerMember, requestPasswordReset, resetPassword, verifyEmailToken } from "@/server/services/auth";
import * as admin from "@/server/services/admin";
import * as billing from "@/server/services/billing";
import * as members from "@/server/services/members";
import { getThread, listConversations, sendMessage } from "@/server/services/messaging";
import { getStore, resetStore } from "@/server/store";
import type { User } from "@/lib/types";

const newUser = (over: Partial<Parameters<typeof registerMember>[0]> = {}) => ({
  displayName: "Tester", email: "tester@example.com", password: "Str0ngPassword!", dob: "1991-05-05", gender: "man" as const,
  interestedIn: ["woman" as const], city: "London", intention: "long_term" as const, bio: "Just a perfectly fine long introduction text.",
  confirmAge: true as const, acceptTerms: true as const, marketingConsent: false, ...over,
});

async function user(id: string): Promise<User> {
  return (await getStore()).users.get(id)!;
}
async function registerAndLogin(email = "tester@example.com") {
  const res = await registerMember(newUser({ email }), "1.1.1.1");
  const token = new URL(res.demoLink!).searchParams.get("token")!;
  await verifyEmailToken(token);
  const auth = await authenticate(email, "Str0ngPassword!", "1.1.1.1");
  if (!auth.ok) throw new Error(auth.message);
  return auth.user;
}

beforeAll(() => resetStore());
beforeEach(async () => { resetRateLimits(); await resetStore(); });

describe("authentication", () => {
  it("registers, requires verification, then signs in", async () => {
    const res = await registerMember(newUser(), "9.9.9.9");
    expect(res.ok).toBe(true);
    const early = await authenticate("tester@example.com", "Str0ngPassword!", "9.9.9.9");
    expect(early.ok).toBe(false);
    await verifyEmailToken(new URL(res.demoLink!).searchParams.get("token")!);
    const ok = await authenticate("tester@example.com", "Str0ngPassword!", "9.9.9.9");
    expect(ok.ok).toBe(true);
  });
  it("does not reveal whether an email is registered", async () => {
    const dup = await registerMember(newUser({ email: "demo@velvet.example" }), "2.2.2.2");
    expect(dup.ok).toBe(true);
    expect(dup.demoLink).toBeUndefined();
  });
  it("rejects wrong passwords, and rate limits repeated attempts", async () => {
    for (let i = 0; i < 8; i++) expect((await authenticate("demo@velvet.example", "nope", "3.3.3.3")).ok).toBe(false);
    const limited = await authenticate("demo@velvet.example", "VelvetDemo!2026", "3.3.3.3");
    expect(limited.ok).toBe(false);
  });
  it("blocks suspended and banned accounts from signing in", async () => {
    const u = await registerAndLogin();
    const adminUser = await user("demo_admin");
    await admin.setAccountStatus(adminUser, u.id, "suspended", "test");
    expect((await authenticate("tester@example.com", "Str0ngPassword!", "5.5.5.5")).ok).toBe(false);
    await admin.setAccountStatus(adminUser, u.id, "banned", "test");
    const r = await authenticate("tester@example.com", "Str0ngPassword!", "5.5.5.5");
    expect(r.ok).toBe(false);
  });
  it("resets passwords with single-use tokens and never exposes demo/admin reset links", async () => {
    await registerAndLogin();
    const rq = await requestPasswordReset("tester@example.com", "4.4.4.4");
    const token = new URL(rq.demoLink!).searchParams.get("token")!;
    expect((await resetPassword(token, "An0therStrongPass")).ok).toBe(true);
    expect((await resetPassword(token, "An0therStrongPass")).ok).toBe(false);
    expect((await authenticate("tester@example.com", "An0therStrongPass", "4.4.4.4")).ok).toBe(true);
    expect((await requestPasswordReset("demo@velvet.example", "4.4.4.4")).demoLink).toBeUndefined();
    expect((await requestPasswordReset("admin@velvet.example", "4.4.4.4")).demoLink).toBeUndefined();
  });
});

describe("profile privacy", () => {
  it("never leaks email, date of birth or coordinates in public profiles", async () => {
    const viewer = await user("demo_member");
    const res = await members.discover(viewer, discoverQuerySchema.parse({}));
    expect(res.members.length).toBeGreaterThan(0);
    const json = JSON.stringify(res.members);
    expect(json).not.toMatch(/@/);
    expect(json).not.toMatch(/"(dob|passwordHash|email|lat|lng|latitude|longitude|userId)"/i);
    for (const m of res.members) {
      expect(m.age).toBeGreaterThanOrEqual(18);
      if (m.distanceKm !== null) expect(m.distanceKm % 5).toBe(0);
    }
  });
  it("hides hidden, suspended and blocked members and the admin", async () => {
    const viewer = await user("demo_member");
    const store = await getStore();
    const ids = (await members.discover(viewer, discoverQuerySchema.parse({ ageMax: 99 }))).members.map((m) => m.id);
    expect(ids).not.toContain("demo_quentin"); // hidden
    expect(ids).not.toContain("demo_admin");
    expect(await members.getMember(viewer, "demo_quentin")).toBeNull();
    const target = ids[0];
    await members.blockMember(viewer, target);
    expect(await members.getMember(viewer, target)).toBeNull();
    const other = store.users.get(target)!;
    expect(await members.getMember(other, "demo_member")).toBeNull();
  });
  it("only shows approved photos to other members", async () => {
    const viewer = await user("demo_member");
    const camille = await members.getMember(viewer, "demo_camille");
    expect(camille!.photos.length).toBe(2); // third is pending
  });
  it("verified-only profiles are hidden from unverified viewers", async () => {
    const me = await registerAndLogin();
    expect(await members.getMember(me, "demo_oscar")).toBeNull();
    (await getStore()).profiles.get(me.id)!.verified = true;
    expect(await members.getMember(me, "demo_oscar")).not.toBeNull();
  });
});

describe("discovery", () => {
  it("filters by age, gender, verified and paginates", async () => {
    const viewer = await user("demo_member");
    const res = await members.discover(viewer, discoverQuerySchema.parse({ gender: "woman", ageMin: 30, ageMax: 40, verified: "true" }));
    for (const m of res.members) { expect(m.gender).toBe("woman"); expect(m.age).toBeGreaterThanOrEqual(30); expect(m.age).toBeLessThanOrEqual(40); expect(m.verified).toBe(true); }
    const all = await members.discover(viewer, discoverQuerySchema.parse({}));
    expect(all.pageSize).toBe(24);
    const page2 = await members.discover(viewer, discoverQuerySchema.parse({ page: 2 }));
    if (all.totalPages > 1) expect(page2.members[0].id).not.toBe(all.members[0].id);
  });
  it("gates advanced filters by tier", async () => {
    const silver = await registerAndLogin();
    const res = await members.discover(silver, discoverQuerySchema.parse({ interest: "Travel" }));
    expect(res.lockedFilters).toBe(true);
    expect(res.pageSize).toBe(12);
    const gold = await members.discover(await user("demo_member"), discoverQuerySchema.parse({ interest: "Travel" }));
    expect(gold.lockedFilters).toBe(false);
    for (const m of gold.members) expect(m.interests).toContain("Travel");
  });
});

describe("messaging", () => {
  it("sends, tracks unread and read status, and delivers demo replies", async () => {
    const me = await registerAndLogin();
    const sent = await sendMessage(me, "demo_isabelle", "Hello Isabelle, how are you?");
    expect(sent.ok).toBe(true);
    expect((await listConversations(me))[0].lastMessage).toContain("Hello");
    const store = await getStore();
    store.pendingReplies.forEach((r) => (r.dueAt = 0));
    const convs = await listConversations(me);
    expect(convs[0].unread).toBe(1);
    const thread = await getThread(me, sent.conversationId!);
    expect(thread!.messages.length).toBe(2);
    expect((await listConversations(me))[0].unread).toBe(0);
  });
  it("protects conversations from non-participants", async () => {
    const me = await registerAndLogin();
    expect(await getThread(me, "conv_demo_isabelle_demo_member")).toBeNull();
  });
  it("enforces the daily allowance for Silver", async () => {
    const me = await registerAndLogin();
    for (let i = 0; i < 5; i++) expect((await sendMessage(me, "demo_isabelle", `hi ${i}`)).ok).toBe(true);
    const sixth = await sendMessage(me, "demo_isabelle", "one more");
    expect(sixth.ok).toBe(false);
    expect(sixth.message).toMatch(/allowance/);
  });
  it("blocks messaging between blocked members", async () => {
    const me = await user("demo_member");
    await members.blockMember(me, "demo_isabelle");
    expect((await sendMessage(me, "demo_isabelle", "hello")).ok).toBe(false);
    expect((await listConversations(me)).find((c) => c.other.id === "demo_isabelle")).toBeUndefined();
  });
});

describe("subscriptions", () => {
  it("upgrades immediately, schedules downgrades, cancels and resumes", async () => {
    const me = await registerAndLogin();
    const store = await getStore();
    expect((await billing.changePlan(me, "gold", "http://x")).ok).toBe(true);
    expect(billing.tierOf(store, me.id)).toBe("gold");
    expect((await billing.billingHistory(me.id)).length).toBe(1);
    expect((await billing.changePlan(me, "platinum", "http://x")).ok).toBe(true);
    await billing.changePlan(me, "gold", "http://x");
    expect(billing.currentSubscription(store, me.id).pendingTier).toBe("gold");
    expect(billing.tierOf(store, me.id)).toBe("platinum");
    expect((await billing.cancelSubscription(me)).ok).toBe(true);
    expect(billing.currentSubscription(store, me.id).cancelAtPeriodEnd).toBe(true);
    expect((await billing.resumeSubscription(me)).ok).toBe(true);
    billing.currentSubscription(store, me.id).cancelAtPeriodEnd = true;
    billing.currentSubscription(store, me.id).currentPeriodEnd = new Date(Date.now() - 1000).toISOString();
    expect(billing.tierOf(store, me.id)).toBe("silver");
  });
  it("only enables incognito for Platinum", async () => {
    const me = await registerAndLogin();
    const res = await members.updatePrivacy(me, { visibility: "members", showOnline: true, showDistance: true, incognito: true, marketingConsent: false, analyticsConsent: false });
    expect(res.incognitoBlocked).toBe(true);
    expect((await members.getOwnProfile(me.id)).incognito).toBe(false);
  });
});

describe("administration", () => {
  it("refuses every admin service for non-admins", async () => {
    const member = await user("demo_member");
    await expect(admin.analytics(member)).rejects.toThrow("Forbidden");
    await expect(admin.listMembers(member, "")).rejects.toThrow("Forbidden");
    await expect(admin.setAccountStatus(member, "demo_isabelle", "banned", "")).rejects.toThrow("Forbidden");
    await expect(admin.listAudit(member)).rejects.toThrow("Forbidden");
    await expect(admin.moderatePhoto(member, "demo_camille", "x", "approved")).rejects.toThrow("Forbidden");
  });
  it("moderates, suspends and records an audit trail", async () => {
    const a = await user("demo_admin");
    const before = (await admin.listAudit(a)).length;
    await admin.setAccountStatus(a, "demo_pierre", "suspended", "Policy breach");
    await admin.resolveReport(a, "rep_1", "resolved");
    await admin.moderatePhoto(a, "demo_camille", "demo_camille_p2", "approved");
    const log = await admin.listAudit(a);
    expect(log.length).toBe(before + 3);
    expect(log[0].adminId).toBe("demo_admin");
    expect((await getStore()).users.get("demo_pierre")!.status).toBe("suspended");
    const ids = (await members.discover(await user("demo_member"), discoverQuerySchema.parse({}))).members.map((m) => m.id);
    expect(ids).not.toContain("demo_pierre");
  });
  it("computes analytics separating demo from real members", async () => {
    const a = await user("demo_admin");
    await registerAndLogin();
    const stats = await admin.analytics(a);
    expect(stats.realMembers).toBe(1);
    expect(stats.demoMembers).toBeGreaterThan(40);
    expect(stats.totalRevenuePence).toBeGreaterThan(0);
  });
});

describe("data rights", () => {
  it("exports and deletes an account completely", async () => {
    const me = await registerAndLogin();
    await sendMessage(me, "demo_isabelle", "hello there");
    const data = await members.exportUserData(me);
    expect(data.messages.length).toBe(1);
    expect(JSON.stringify(data)).not.toContain("passwordHash");
    await members.deleteAccount(me);
    const store = await getStore();
    expect(store.users.has(me.id)).toBe(false);
    expect(store.profiles.has(me.id)).toBe(false);
    expect(store.messages.some((m) => m.senderId === me.id)).toBe(false);
  });
});
