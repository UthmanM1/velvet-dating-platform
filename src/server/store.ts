/**
 * In-memory demo data store with deterministic seed data.
 *
 * Everything seeded here is fictional and flagged `isDemo: true`. Real registrations are stored with
 * `isDemo: false`, so demo and real data are always distinguishable (and the Supabase seed.sql mirrors this).
 *
 * NOTE: this store lives in process memory. On serverless hosting each instance has its own copy and
 * state resets on cold start. Seeded accounts always exist; newly registered accounts are ephemeral.
 * Production persistence is provided by the Postgres schema in supabase/migrations.
 */
import { config } from "@/lib/config";
import { CITY_NAMES, INTERESTS } from "@/lib/reference";
import { hashPassword } from "@/lib/security";
import type {
  AuditLog,
  Block,
  Conversation,
  Favourite,
  Gender,
  InterestSignal,
  Intention,
  Message,
  Notification,
  OutboxEmail,
  Payment,
  Profile,
  ProfileView,
  Report,
  Subscription,
  Tier,
  TokenRecord,
  User,
} from "@/lib/types";

export interface Store {
  users: Map<string, User>;
  profiles: Map<string, Profile>;
  conversations: Map<string, Conversation>;
  messages: Message[];
  favourites: Favourite[];
  interests: InterestSignal[];
  blocks: Block[];
  reports: Report[];
  subscriptions: Map<string, Subscription>;
  payments: Payment[];
  notifications: Notification[];
  views: ProfileView[];
  audit: AuditLog[];
  tokens: Map<string, TokenRecord>;
  outbox: OutboxEmail[];
  /** Demo-mode simulated replies from seeded members, delivered when due. */
  pendingReplies: { conversationId: string; from: string; to: string; body: string; dueAt: number }[];
}

const g = globalThis as unknown as { __velvetStore?: Promise<Store> };

export function getStore(): Promise<Store> {
  if (!g.__velvetStore) g.__velvetStore = buildSeed();
  return g.__velvetStore;
}

/** Test helper: rebuild a fresh store. */
export function resetStore(): Promise<Store> {
  g.__velvetStore = buildSeed();
  return g.__velvetStore;
}

export function conversationId(a: string, b: string): string {
  return `conv_${[a, b].sort().join("_")}`;
}

/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MEMBERS: { name: string; gender: Gender }[] = [
  ...["Isabelle", "Anya", "Camille", "Seraphine", "Imogen", "Lucia", "Marguerite", "Delphine", "Octavia", "Rosalind", "Talia", "Beatrix", "Noor", "Elodie", "Freya", "Giselle", "Henrietta", "Ines", "Juliet", "Kiara"].map((name) => ({ name, gender: "woman" as Gender })),
  ...["Julian", "Marcus", "Theo", "Rafael", "Sebastian", "Dominic", "Alistair", "Callum", "Felix", "Gabriel", "Hugo", "Idris", "Jasper", "Lorenzo", "Matteo", "Nathaniel", "Oscar", "Pierre", "Quentin", "Rowan"].map((name) => ({ name, gender: "man" as Gender })),
  ...["Sasha", "Quinn", "Rio", "Ellis"].map((name) => ({ name, gender: "non_binary" as Gender })),
  ...["Arden", "Sloane"].map((name) => ({ name, gender: "other" as Gender })),
];

const BIOS: Record<Intention, string[]> = {
  long_term: [
    "Unhurried dinners, long walks and someone who texts back. Looking for a real partnership with good conversation at its centre.",
    "I believe in doing the small things well. Seeking a thoughtful, grounded person to build something lasting with.",
  ],
  casual_dating: [
    "Good company, good wine, no pressure. Happy to see where an easy evening leads.",
    "Busy week, free weekends. I'd like to meet someone fun, curious and relaxed about it all.",
  ],
  companionship: [
    "I'd love a plus-one for concerts, galleries and spontaneous weekends away. Warmth and humour matter most.",
    "Seeking a companion who enjoys quiet evenings as much as a night out. Kindness is the benchmark.",
  ],
  exploring: [
    "Recently rediscovering what I enjoy. Open-minded, honest and keen to meet people without a script.",
    "Not sure what I'm looking for until I meet it. Curiosity first, labels later.",
  ],
  discreet_connection: [
    "Privacy matters to me, and I'll respect yours. Looking for a considered, respectful connection.",
    "Discretion, intelligence and mutual respect. I keep a full life and make time for what's worth it.",
  ],
};

const AUTO_REPLIES = [
  "Hi, lovely to hear from you. How's your week been?",
  "That sounds great. Tell me more about what you enjoy doing at the weekend.",
  "I like your profile. Do you have a favourite place to travel?",
  "Thanks for the message. I'm free for a drink later this week if you are.",
];
export { AUTO_REPLIES };

function pick<T>(rnd: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function sample<T>(rnd: () => number, arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
}

function isoMinutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

async function buildSeed(): Promise<Store> {
  const rnd = mulberry32(20261109);
  const now = new Date();
  const store: Store = {
    users: new Map(),
    profiles: new Map(),
    conversations: new Map(),
    messages: [],
    favourites: [],
    interests: [],
    blocks: [],
    reports: [],
    subscriptions: new Map(),
    payments: [],
    notifications: [],
    views: [],
    audit: [],
    tokens: new Map(),
    outbox: [],
    pendingReplies: [],
  };

  const addUser = (u: Partial<User> & Pick<User, "id" | "email">): User => {
    const user: User = {
      passwordHash: "!",
      role: "member",
      status: "active",
      emailVerified: true,
      createdAt: isoMinutesAgo(60 * 24 * (20 + Math.floor(rnd() * 200))),
      isDemo: true,
      consents: [
        { type: "terms", granted: true, at: now.toISOString() },
        { type: "privacy", granted: true, at: now.toISOString() },
        { type: "age_confirmation", granted: true, at: now.toISOString() },
      ],
      ageVerification: { status: "self_declared" },
      ...u,
    };
    store.users.set(user.id, user);
    return user;
  };

  const dobForAge = (age: number): string => {
    const d = new Date(now);
    d.setUTCFullYear(d.getUTCFullYear() - age);
    d.setUTCDate(d.getUTCDate() - Math.floor(rnd() * 330));
    return d.toISOString().slice(0, 10);
  };

  const photos = (id: string, count: number, pendingLast = false) =>
    Array.from({ length: count }, (_, i) => ({
      id: `${id}_p${i}`,
      url: `/api/avatar/${id}?v=${i}`,
      status: pendingLast && i === count - 1 ? ("pending" as const) : ("approved" as const),
      isPrimary: i === 0,
      createdAt: now.toISOString(),
    }));

  /* ---- seeded members ---- */
  const tierPlan: Tier[] = [];
  MEMBERS.forEach((_, i) => tierPlan.push(i % 7 === 0 ? "platinum" : i % 3 === 0 ? "gold" : "silver"));

  MEMBERS.forEach((m, i) => {
    const id = `demo_${m.name.toLowerCase()}`;
    const intention = pick(rnd, ["long_term", "casual_dating", "companionship", "exploring", "discreet_connection"] as Intention[]);
    const city = i % 4 === 0 ? "London" : i % 5 === 0 ? "Manchester" : pick(rnd, CITY_NAMES);
    const age = 24 + Math.floor(rnd() * 34);
    const interestedIn: Gender[] =
      m.gender === "woman" ? (rnd() > 0.2 ? ["man"] : ["man", "woman"])
      : m.gender === "man" ? (rnd() > 0.2 ? ["woman"] : ["woman", "man"])
      : ["woman", "man", "non_binary"];
    const activity = (["online", "online", "recent", "recent", "day", "week"] as const)[i % 6];
    const hidden = m.name === "Quentin" || m.name === "Ellis";

    addUser({ id, email: `${m.name.toLowerCase()}@members.velvet.example` });
    store.profiles.set(id, {
      userId: id,
      displayName: m.name,
      dob: dobForAge(age),
      gender: m.gender,
      interestedIn,
      city,
      intention,
      bio: pick(rnd, BIOS[intention]),
      interests: sample(rnd, INTERESTS, 4 + Math.floor(rnd() * 3)),
      relationshipPreferences: "Values honesty, curiosity and good manners.",
      lifestyle: {
        smoking: pick(rnd, ["never", "never", "socially"] as const),
        drinking: pick(rnd, ["socially", "socially", "never"] as const),
        children: pick(rnd, ["none", "have", "want", "open"] as const),
        fitness: pick(rnd, ["rarely", "weekly", "daily"] as const),
      },
      photos: photos(id, 3, m.name === "Camille" || m.name === "Hugo"),
      visibility: hidden ? "hidden" : m.name === "Oscar" ? "verified_only" : "members",
      incognito: false,
      showOnline: true,
      showDistance: true,
      verified: rnd() > 0.55,
      lastActiveAt: now.toISOString(),
      seedActivity: activity,
      createdAt: isoMinutesAgo(60 * 24 * (10 + Math.floor(rnd() * 300))),
    });
    const tier = tierPlan[i];
    store.subscriptions.set(id, {
      userId: id,
      tier,
      status: "active",
      provider: "demo",
      currentPeriodEnd: new Date(now.getTime() + (5 + (i % 25)) * 86_400_000).toISOString(),
      cancelAtPeriodEnd: false,
    });
    if (tier !== "silver") {
      const pence = tier === "gold" ? 1499 : 2999;
      for (let k = 1; k <= 1 + (i % 4); k++) {
        store.payments.push({
          id: `pay_${id}_${k}`,
          userId: id,
          amountPence: pence,
          currency: "gbp",
          description: `${tier === "gold" ? "Gold" : "Platinum"} membership (demo)`,
          status: "succeeded",
          provider: "demo",
          createdAt: new Date(now.getTime() - k * 30 * 86_400_000).toISOString(),
        });
      }
    }
  });

  /* ---- demo member account ---- */
  const demoId = "demo_member";
  addUser({
    id: demoId,
    email: config.demo.memberEmail,
    passwordHash: await hashPassword(config.demo.memberPassword),
  });
  store.profiles.set(demoId, {
    userId: demoId,
    displayName: "Alex",
    dob: dobForAge(34),
    gender: "man",
    interestedIn: ["woman"],
    city: "London",
    intention: "long_term",
    bio: "Demo member account. Enjoys good food, live music and weekends away. Explore VELVET as a Gold member.",
    interests: ["Travel", "Live music", "Fine dining", "Hiking"],
    relationshipPreferences: "Looking for someone warm, curious and direct.",
    lifestyle: { smoking: "never", drinking: "socially", children: "open", fitness: "weekly" },
    photos: photos(demoId, 2),
    visibility: "members",
    incognito: false,
    showOnline: true,
    showDistance: true,
    verified: true,
    lastActiveAt: now.toISOString(),
    createdAt: isoMinutesAgo(60 * 24 * 90),
  });
  store.subscriptions.set(demoId, {
    userId: demoId,
    tier: "gold",
    status: "active",
    provider: "demo",
    currentPeriodEnd: new Date(now.getTime() + 12 * 86_400_000).toISOString(),
    cancelAtPeriodEnd: false,
  });
  for (let k = 1; k <= 3; k++) {
    store.payments.push({
      id: `pay_demo_member_${k}`,
      userId: demoId,
      amountPence: 1499,
      currency: "gbp",
      description: "Gold membership (demo)",
      status: "succeeded",
      provider: "demo",
      createdAt: new Date(now.getTime() - (k * 30 - 18) * 86_400_000).toISOString(),
    });
  }

  /* ---- administrator demo account (only when a password is configured) ---- */
  if (config.demo.adminPassword) {
    const adminId = "demo_admin";
    addUser({
      id: adminId,
      email: config.demo.adminEmail,
      role: "admin",
      passwordHash: await hashPassword(config.demo.adminPassword),
    });
    store.profiles.set(adminId, {
      userId: adminId,
      displayName: "VELVET Admin",
      dob: dobForAge(40),
      gender: "other",
      interestedIn: ["other"],
      city: "London",
      intention: "exploring",
      bio: "Administrator demonstration account. Not a member profile.",
      interests: [],
      relationshipPreferences: "",
      lifestyle: { smoking: "never", drinking: "never", children: "none", fitness: "weekly" },
      photos: [],
      visibility: "hidden",
      incognito: true,
      showOnline: false,
      showDistance: false,
      verified: true,
      lastActiveAt: now.toISOString(),
      createdAt: isoMinutesAgo(60 * 24 * 120),
    });
    store.subscriptions.set(adminId, {
      userId: adminId,
      tier: "platinum",
      status: "active",
      provider: "demo",
      currentPeriodEnd: new Date(now.getTime() + 365 * 86_400_000).toISOString(),
      cancelAtPeriodEnd: false,
    });
  }

  /* ---- demonstration conversations ---- */
  const convoScripts: { other: string; lines: [boolean, string, number][] }[] = [
    {
      other: "demo_isabelle",
      lines: [
        [false, "Hi Alex, I noticed we both love live music. Seen anyone good recently?", 2900],
        [true, "Hi Isabelle! A jazz night in Shoreditch last week. You?", 2880],
        [false, "Jealous. I'm hoping to catch a gig at the Barbican next month. Would you join me?", 95],
      ],
    },
    {
      other: "demo_camille",
      lines: [
        [true, "Your travel photos are wonderful. Where was the last one taken?", 4300],
        [false, "Lisbon in the spring. I'd go back tomorrow.", 4250],
        [true, "Good choice. Any restaurant recommendations?", 4200],
        [false, "Several. I'll send you a list.", 4190],
      ],
    },
    {
      other: "demo_anya",
      lines: [[false, "Hello Alex. Your bio made me smile. How was your weekend?", 20]],
    },
  ];
  for (const script of convoScripts) {
    const cid = conversationId(demoId, script.other);
    store.conversations.set(cid, { id: cid, participantIds: [demoId, script.other], createdAt: isoMinutesAgo(5000) });
    script.lines.forEach(([fromDemo, body, ago], idx) => {
      const unread = !fromDemo && idx === script.lines.length - 1 && (script.other === "demo_isabelle" || script.other === "demo_anya");
      store.messages.push({
        id: `msg_${cid}_${idx}`,
        conversationId: cid,
        senderId: fromDemo ? demoId : script.other,
        body,
        createdAt: isoMinutesAgo(ago),
        readAt: unread ? undefined : isoMinutesAgo(ago - 1),
      });
    });
  }

  /* ---- favourites, interests, views, notifications for the demo member ---- */
  ["demo_isabelle", "demo_freya", "demo_lucia"].forEach((t, i) =>
    store.favourites.push({ userId: demoId, targetId: t, createdAt: isoMinutesAgo(600 * (i + 1)) }),
  );
  ["demo_elodie", "demo_talia", "demo_noor"].forEach((f, i) =>
    store.interests.push({ id: `int_${f}`, fromId: f, toId: demoId, createdAt: isoMinutesAgo(180 * (i + 1)), seen: i > 1 }),
  );
  ["demo_elodie", "demo_talia", "demo_noor", "demo_giselle", "demo_ines", "demo_juliet", "demo_kiara"].forEach((v, i) =>
    store.views.push({ viewerId: v, targetId: demoId, at: isoMinutesAgo(90 * (i + 1)) }),
  );
  store.notifications.push(
    { id: "n1", userId: demoId, type: "message", title: "New message from Isabelle", body: "Would you join me at the Barbican?", href: "/dashboard/messages/conv_demo_isabelle_demo_member", read: false, createdAt: isoMinutesAgo(95) },
    { id: "n2", userId: demoId, type: "interest", title: "Elodie expressed interest", body: "Take a look at her profile.", href: "/discover/demo_elodie", read: false, createdAt: isoMinutesAgo(180) },
    { id: "n3", userId: demoId, type: "system", title: "Welcome to VELVET", body: "Complete your profile to improve your visibility.", href: "/dashboard/profile", read: true, createdAt: isoMinutesAgo(60 * 24 * 90) },
  );

  /* ---- reports and audit entries ---- */
  store.reports.push(
    { id: "rep_1", reporterId: "demo_freya", targetId: "demo_pierre", reason: "inappropriate_content", details: "Bio contains a link to an external site.", status: "open", createdAt: isoMinutesAgo(300) },
    { id: "rep_2", reporterId: "demo_lucia", targetId: "demo_rowan", reason: "fake_profile", details: "Photos look like they come from a stock library.", status: "open", createdAt: isoMinutesAgo(1500) },
    { id: "rep_3", reporterId: "demo_theo", targetId: "demo_giselle", reason: "harassment", details: "Repeated messages after I declined.", status: "resolved", createdAt: isoMinutesAgo(6000), resolvedBy: "system", resolvedAt: isoMinutesAgo(5800) },
  );
  store.audit.push(
    { id: "aud_1", adminId: "system", action: "report.resolve", targetType: "report", targetId: "rep_3", detail: "Warning issued (seed data).", at: isoMinutesAgo(5800) },
    { id: "aud_2", adminId: "system", action: "user.verify", targetType: "user", targetId: "demo_member", detail: "Verified profile (seed data).", at: isoMinutesAgo(60 * 24 * 80) },
  );

  return store;
}
