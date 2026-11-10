import { describe, expect, it, beforeEach } from "vitest";
import { ageFromDob, coarseDistanceKm, cleanText, haversineKm } from "@/lib/utils";
import { hashPassword, signSession, verifyPassword, verifySession } from "@/lib/security";
import { consume, resetRateLimits } from "@/lib/rate-limit";
import { registerSchema, passwordSchema } from "@/lib/validation";
import { getPlans, entitlementsFor, tierRank } from "@/lib/plans";
import { sniffImageType } from "@/server/adapters";
import { log } from "@/lib/log";

describe("age and distance", () => {
  const now = new Date("2026-11-09T12:00:00Z");
  it("computes age around birthdays", () => {
    expect(ageFromDob("2008-11-09", now)).toBe(18);
    expect(ageFromDob("2008-11-10", now)).toBe(17);
    expect(ageFromDob("1990-02-30", now)).toBe(-1);
    expect(ageFromDob("garbage", now)).toBe(-1);
  });
  it("rounds distances coarsely", () => {
    expect(coarseDistanceKm(1)).toBe(5);
    expect(coarseDistanceKm(12.1)).toBe(15);
    const d = haversineKm({ lat: 51.5074, lng: -0.1278 }, { lat: 53.4808, lng: -2.2426 });
    expect(d).toBeGreaterThan(250);
    expect(d).toBeLessThan(110 * 3);
  });
  it("cleans text", () => expect(cleanText("  a\u0000  b ", 10)).toBe("a b"));
});

describe("passwords and sessions", () => {
  it("hashes and verifies", async () => {
    const h = await hashPassword("Correct-Horse-9");
    expect(h).not.toContain("Correct");
    expect(await verifyPassword("Correct-Horse-9", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
    expect(await verifyPassword("x", "!")).toBe(false);
  });
  it("signs, verifies, rejects tampering and expiry", () => {
    const tok = signSession({ uid: "u1", exp: Date.now() + 10_000 });
    expect(verifySession(tok)?.uid).toBe("u1");
    expect(verifySession(tok.replace(/.$/, "x"))).toBeNull();
    expect(verifySession(signSession({ uid: "u1", exp: Date.now() - 1 }))).toBeNull();
    expect(verifySession(undefined)).toBeNull();
    const [body, sig] = tok.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "admin", exp: Date.now() + 1e6 })).toString("base64url");
    expect(verifySession(`${forged}.${sig}`)).toBeNull();
    expect(body).toBeTruthy();
  });
});

describe("rate limiter", () => {
  beforeEach(() => resetRateLimits());
  it("blocks after the limit and recovers", () => {
    for (let i = 0; i < 3; i++) expect(consume("k", 3, 1000, 1000 + i).allowed).toBe(true);
    expect(consume("k", 3, 1000, 1500).allowed).toBe(false);
    expect(consume("k", 3, 1000, 2500).allowed).toBe(true);
  });
});

describe("validation", () => {
  const base = {
    displayName: "Alex", email: "A@Example.com", password: "Str0ngPassword", dob: "1990-01-01", gender: "man", interestedIn: ["woman"],
    city: "London", intention: "long_term", bio: "A sufficiently long introduction here.", confirmAge: true, acceptTerms: true,
  };
  it("accepts a valid registration and normalises email", () => {
    const r = registerSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("a@example.com");
  });
  it("rejects under-18s", () => {
    const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - 17);
    expect(registerSchema.safeParse({ ...base, dob: d.toISOString().slice(0, 10) }).success).toBe(false);
  });
  it("requires age confirmation and terms", () => {
    expect(registerSchema.safeParse({ ...base, confirmAge: false }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
  });
  it("enforces password strength", () => {
    expect(passwordSchema.safeParse("short1A").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase123").success).toBe(false);
    expect(passwordSchema.safeParse("GoodPassw0rdHere").success).toBe(true);
  });
  it("rejects unknown cities and markup in names", () => {
    expect(registerSchema.safeParse({ ...base, city: "Narnia" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, displayName: "<script>" }).success).toBe(false);
  });
});

describe("plans", () => {
  it("has three ordered tiers with increasing entitlements", () => {
    expect(getPlans().map((p) => p.tier)).toEqual(["silver", "gold", "platinum"]);
    expect(entitlementsFor("silver").advancedSearch).toBe(false);
    expect(entitlementsFor("gold").messagesPerDay).toBeGreaterThan(entitlementsFor("silver").messagesPerDay);
    expect(entitlementsFor("platinum").incognito).toBe(true);
    expect(tierRank("platinum")).toBeGreaterThan(tierRank("gold"));
  });
});

describe("uploads and logging", () => {
  it("sniffs real image signatures and rejects others", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const html = new TextEncoder().encode("<html><script>alert(1)</script>");
    expect(sniffImageType(jpeg)).toBe("image/jpeg");
    expect(sniffImageType(html)).toBeNull();
  });
  it("never throws when logging sensitive keys", () => expect(() => log("x", { email: "a@b.c", ok: true })).not.toThrow());
});
