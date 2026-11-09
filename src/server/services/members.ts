import { CITIES, GENDERS } from "@/lib/reference";
import { entitlementsFor } from "@/lib/plans";
import type { Gender, Notification, Photo, Profile, PublicProfile, Tier, User } from "@/lib/types";
import { ageFromDob, clamp, cleanText, coarseDistanceKm, haversineKm, timeAgo, uid } from "@/lib/utils";
import type { DiscoverQuery } from "@/lib/validation";
import { getStorage, MAX_IMAGE_BYTES, sniffImageType } from "../adapters";
import { getStore, type Store } from "../store";
import { entitlementsOfUser, tierOf } from "./billing";

const ONLINE_WINDOW_MS = 5 * 60_000;

/* ---------- presence ---------- */

export function presence(p: Profile, now = Date.now()): { online: boolean; label: string } {
  if (p.seedActivity) {
    switch (p.seedActivity) {
      case "online": return { online: true, label: "Online now" };
      case "recent": return { online: false, label: "Active today" };
      case "day": return { online: false, label: "Active yesterday" };
      default: return { online: false, label: "Active this week" };
    }
  }
  const last = new Date(p.lastActiveAt).getTime();
  if (now - last < ONLINE_WINDOW_MS) return { online: true, label: "Online now" };
  return { online: false, label: `Active ${timeAgo(p.lastActiveAt)}` };
}

function activityRank(p: Profile): number {
  if (p.seedActivity) return { online: 0, recent: 60, day: 1440, week: 7000 }[p.seedActivity];
  return Math.floor((Date.now() - new Date(p.lastActiveAt).getTime()) / 60_000);
}

/* ---------- visibility rules ---------- */

export function isBlockedEitherWay(store: Store, a: string, b: string): boolean {
  return store.blocks.some((x) => (x.blockerId === a && x.blockedId === b) || (x.blockerId === b && x.blockedId === a));
}

function viewerIsVerified(store: Store, viewerId: string): boolean {
  return Boolean(store.profiles.get(viewerId)?.verified);
}

export function canViewProfile(store: Store, viewer: User, target: Profile): boolean {
  if (target.userId === viewer.id) return true;
  const tu = store.users.get(target.userId);
  if (!tu || tu.status !== "active" || tu.role === "admin") return false;
  if (target.visibility === "hidden") return false;
  if (target.visibility === "verified_only" && !viewerIsVerified(store, viewer.id)) return false;
  if (isBlockedEitherWay(store, viewer.id, target.userId)) return false;
  return true;
}

/** Only approved photos are visible to others; owners and moderators see everything. */
export function visiblePhotos(p: Profile, forOwner: boolean): Photo[] {
  return p.photos.filter((ph) => forOwner || ph.status === "approved");
}

export function toPublic(store: Store, viewer: User, p: Profile): PublicProfile {
  const photos = visiblePhotos(p, p.userId === viewer.id);
  const viewerProfile = store.profiles.get(viewer.id);
  let distanceKm: number | null = null;
  if (p.showDistance && viewerProfile && CITIES[p.city] && CITIES[viewerProfile.city]) {
    distanceKm = p.city === viewerProfile.city ? 5 : coarseDistanceKm(haversineKm(CITIES[p.city], CITIES[viewerProfile.city]));
  }
  const pres = presence(p);
  return {
    id: p.userId,
    displayName: p.displayName,
    age: ageFromDob(p.dob),
    gender: p.gender,
    city: p.city,
    intention: p.intention,
    bio: p.bio,
    interests: p.interests,
    relationshipPreferences: p.relationshipPreferences,
    lifestyle: p.lifestyle,
    photos: photos.map((x) => ({ id: x.id, url: x.url })),
    primaryPhoto: (photos.find((x) => x.isPrimary) ?? photos[0])?.url ?? `/api/avatar/${p.userId}`,
    online: p.showOnline && pres.online,
    lastActiveLabel: p.showOnline ? pres.label : "Recently active",
    verified: p.verified,
    distanceKm,
    tier: tierOf(store, p.userId),
    isFavourite: store.favourites.some((f) => f.userId === viewer.id && f.targetId === p.userId),
    isBlocked: store.blocks.some((b) => b.blockerId === viewer.id && b.blockedId === p.userId),
  };
}

/* ---------- discovery ---------- */

export interface DiscoverResult {
  members: PublicProfile[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  tier: Tier;
  lockedFilters: boolean;
}

export async function discover(viewer: User, q: DiscoverQuery): Promise<DiscoverResult> {
  const store = await getStore();
  const tier = tierOf(store, viewer.id);
  const ent = entitlementsFor(tier);
  const me = store.profiles.get(viewer.id);
  const advancedRequested = Boolean(q.distance || q.interest || q.recent);
  const lockedFilters = advancedRequested && !ent.advancedSearch;

  let list = [...store.profiles.values()].filter((p) => p.userId !== viewer.id && canViewProfile(store, viewer, p));

  const genderFilter = q.gender ?? undefined;
  if (genderFilter) list = list.filter((p) => p.gender === genderFilter);
  list = list.filter((p) => {
    const a = ageFromDob(p.dob);
    return a >= q.ageMin && a <= q.ageMax;
  });
  if (q.intention) list = list.filter((p) => p.intention === q.intention);
  if (q.city) list = list.filter((p) => p.city === q.city);
  if (q.verified) list = list.filter((p) => p.verified);
  if (q.online) list = list.filter((p) => p.showOnline && presence(p).online);

  if (ent.advancedSearch) {
    if (q.interest) list = list.filter((p) => p.interests.includes(q.interest!));
    if (q.recent) list = list.filter((p) => activityRank(p) <= 1440);
    if (q.distance && me && CITIES[me.city]) {
      list = list.filter((p) => CITIES[p.city] && haversineKm(CITIES[p.city], CITIES[me.city]) <= q.distance!);
    }
  }

  const dist = (p: Profile) => (me && CITIES[me.city] && CITIES[p.city] ? haversineKm(CITIES[p.city], CITIES[me.city]) : 9999);
  const mutual = (p: Profile) => (me && me.interestedIn.includes(p.gender) ? 0 : 1) + (p.interestedIn.includes(me?.gender ?? "other") ? 0 : 1);
  const priority = (p: Profile) => (entitlementsOfUser(store, p.userId).priorityVisibility ? 0 : 1);

  const sorters: Record<DiscoverQuery["sort"], (a: Profile, b: Profile) => number> = {
    relevance: (a, b) => priority(a) - priority(b) || mutual(a) - mutual(b) || activityRank(a) - activityRank(b) || dist(a) - dist(b),
    active: (a, b) => activityRank(a) - activityRank(b),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    distance: (a, b) => dist(a) - dist(b),
    age: (a, b) => ageFromDob(a.dob) - ageFromDob(b.dob),
  };
  list.sort(sorters[q.sort] ?? sorters.relevance);

  const pageSize = ent.discoveryPageSize;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const page = clamp(q.page, 1, totalPages);
  return {
    members: list.slice((page - 1) * pageSize, page * pageSize).map((p) => toPublic(store, viewer, p)),
    total: list.length, page, pageSize, totalPages, tier, lockedFilters,
  };
}

/** Public, signed-out teaser: names, age bracket and general city only. */
export async function teaserMembers(limit = 8): Promise<Pick<PublicProfile, "id" | "displayName" | "age" | "city" | "primaryPhoto" | "verified" | "online">[]> {
  const store = await getStore();
  return [...store.profiles.values()]
    .filter((p) => {
      const u = store.users.get(p.userId);
      return u?.isDemo && u.status === "active" && u.role === "member" && p.visibility === "members" && p.userId !== "demo_member" && p.photos.some((x) => x.status === "approved");
    })
    .sort((a, b) => activityRank(a) - activityRank(b))
    .slice(0, limit)
    .map((p) => ({
      id: p.userId, displayName: p.displayName, age: ageFromDob(p.dob), city: p.city,
      primaryPhoto: `/api/avatar/${p.userId}`, verified: p.verified, online: presence(p).online && p.showOnline,
    }));
}

export async function getMember(viewer: User, id: string): Promise<PublicProfile | null> {
  const store = await getStore();
  const p = store.profiles.get(id);
  if (!p || !canViewProfile(store, viewer, p)) return null;
  if (id !== viewer.id) {
    const viewerIncognito = store.profiles.get(viewer.id)?.incognito && entitlementsOfUser(store, viewer.id).incognito;
    if (!viewerIncognito) {
      store.views = store.views.filter((v) => !(v.viewerId === viewer.id && v.targetId === id));
      store.views.unshift({ viewerId: viewer.id, targetId: id, at: new Date().toISOString() });
    }
  }
  return toPublic(store, viewer, p);
}

/* ---------- interactions ---------- */

function notify(store: Store, n: Omit<Notification, "id" | "read" | "createdAt">) {
  store.notifications.unshift({ id: uid("n_"), read: false, createdAt: new Date().toISOString(), ...n });
}

export async function toggleFavourite(viewer: User, targetId: string): Promise<{ ok: boolean; message: string; favourite?: boolean }> {
  const store = await getStore();
  const target = store.profiles.get(targetId);
  if (!target || !canViewProfile(store, viewer, target) || targetId === viewer.id) return { ok: false, message: "Member not found." };
  const idx = store.favourites.findIndex((f) => f.userId === viewer.id && f.targetId === targetId);
  if (idx >= 0) {
    store.favourites.splice(idx, 1);
    return { ok: true, message: "Removed from favourites.", favourite: false };
  }
  const ent = entitlementsOfUser(store, viewer.id);
  if (store.favourites.filter((f) => f.userId === viewer.id).length >= ent.maxFavourites)
    return { ok: false, message: `Your plan allows up to ${ent.maxFavourites} favourites. Upgrade for more.` };
  store.favourites.push({ userId: viewer.id, targetId, createdAt: new Date().toISOString() });
  const me = store.profiles.get(viewer.id);
  notify(store, { userId: targetId, type: "favourite", title: `${me?.displayName ?? "A member"} added you to favourites`, body: "Take a look at their profile.", href: `/discover/${viewer.id}` });
  return { ok: true, message: "Added to favourites.", favourite: true };
}

export async function sendInterest(viewer: User, targetId: string): Promise<{ ok: boolean; message: string }> {
  const store = await getStore();
  const target = store.profiles.get(targetId);
  if (!target || !canViewProfile(store, viewer, target) || targetId === viewer.id) return { ok: false, message: "Member not found." };
  const ent = entitlementsOfUser(store, viewer.id);
  const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
  const today = store.interests.filter((i) => i.fromId === viewer.id && new Date(i.createdAt) >= startOfDay).length;
  if (store.interests.some((i) => i.fromId === viewer.id && i.toId === targetId)) return { ok: false, message: "You have already shown interest." };
  if (today >= ent.interestsPerDay) return { ok: false, message: `You have used today's ${ent.interestsPerDay} interests. Upgrade for more.` };
  store.interests.push({ id: uid("int_"), fromId: viewer.id, toId: targetId, createdAt: new Date().toISOString(), seen: false });
  const me = store.profiles.get(viewer.id);
  notify(store, { userId: targetId, type: "interest", title: `${me?.displayName ?? "A member"} expressed interest`, body: "Take a look at their profile.", href: `/discover/${viewer.id}` });
  return { ok: true, message: "Interest sent." };
}

export async function blockMember(viewer: User, targetId: string): Promise<{ ok: boolean; message: string }> {
  const store = await getStore();
  if (targetId === viewer.id || !store.profiles.has(targetId)) return { ok: false, message: "Member not found." };
  if (!store.blocks.some((b) => b.blockerId === viewer.id && b.blockedId === targetId))
    store.blocks.push({ blockerId: viewer.id, blockedId: targetId, createdAt: new Date().toISOString() });
  store.favourites = store.favourites.filter((f) => !((f.userId === viewer.id && f.targetId === targetId) || (f.userId === targetId && f.targetId === viewer.id)));
  return { ok: true, message: "Member blocked. They can no longer see your profile or message you." };
}

export async function unblockMember(viewer: User, targetId: string): Promise<void> {
  const store = await getStore();
  store.blocks = store.blocks.filter((b) => !(b.blockerId === viewer.id && b.blockedId === targetId));
}

export async function reportMember(viewer: User, input: { targetId: string; reason: import("@/lib/types").ReportReason; details: string }) {
  const store = await getStore();
  if (!store.profiles.has(input.targetId) || input.targetId === viewer.id) return { ok: false, message: "Member not found." };
  if (store.reports.some((r) => r.reporterId === viewer.id && r.targetId === input.targetId && r.status === "open"))
    return { ok: true, message: "You have already reported this member. Our team is reviewing it." };
  store.reports.unshift({ id: uid("rep_"), reporterId: viewer.id, targetId: input.targetId, reason: input.reason, details: cleanText(input.details, 1000), status: "open", createdAt: new Date().toISOString() });
  return { ok: true, message: "Thank you. Your report has been sent to our moderation team." };
}

/* ---------- own profile ---------- */

export async function getOwnProfile(userId: string): Promise<Profile> {
  const store = await getStore();
  const p = store.profiles.get(userId);
  if (!p) throw new Error("Profile missing");
  return p;
}

export function profileCompletion(p: Profile): { percent: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [p.photos.some((x) => x.status !== "rejected"), "Add a profile photo"],
    [p.photos.filter((x) => x.status !== "rejected").length >= 3, "Add at least three photos"],
    [p.bio.length >= 80, "Write a fuller introduction (80+ characters)"],
    [p.interests.length >= 3, "Choose at least three interests"],
    [p.relationshipPreferences.length >= 10, "Describe what you're looking for"],
    [p.verified, "Get your profile verified"],
  ];
  const done = checks.filter(([ok]) => ok).length;
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter(([ok]) => !ok).map(([, m]) => m) };
}

export async function updateProfile(userId: string, data: {
  displayName: string; city: string; intention: Profile["intention"]; bio: string; interestedIn: Gender[]; interests: string[];
  relationshipPreferences: string; smoking: Profile["lifestyle"]["smoking"]; drinking: Profile["lifestyle"]["drinking"];
  children: Profile["lifestyle"]["children"]; fitness: Profile["lifestyle"]["fitness"];
}) {
  const p = await getOwnProfile(userId);
  Object.assign(p, {
    displayName: cleanText(data.displayName, 30), city: data.city, intention: data.intention, bio: cleanText(data.bio, 600),
    interestedIn: data.interestedIn.filter((g) => GENDERS.includes(g)), interests: data.interests,
    relationshipPreferences: cleanText(data.relationshipPreferences, 400),
    lifestyle: { smoking: data.smoking, drinking: data.drinking, children: data.children, fitness: data.fitness },
  });
}

export async function updatePrivacy(user: User, data: { visibility: Profile["visibility"]; showOnline: boolean; showDistance: boolean; incognito: boolean; marketingConsent: boolean; analyticsConsent: boolean }) {
  const store = await getStore();
  const p = await getOwnProfile(user.id);
  const ent = entitlementsOfUser(store, user.id);
  p.visibility = data.visibility;
  p.showOnline = data.showOnline;
  p.showDistance = data.showDistance;
  p.incognito = ent.incognito ? data.incognito : false;
  const now = new Date().toISOString();
  for (const [type, granted] of [["marketing", data.marketingConsent], ["analytics", data.analyticsConsent]] as const) {
    user.consents = [...user.consents.filter((c) => c.type !== type), { type, granted, at: now }];
  }
  return { incognitoBlocked: data.incognito && !ent.incognito };
}

export async function addPhoto(user: User, file: File): Promise<{ ok: boolean; message: string }> {
  const store = await getStore();
  const p = await getOwnProfile(user.id);
  if (p.photos.length >= 6) return { ok: false, message: "You can upload up to 6 photos." };
  if (file.size === 0) return { ok: false, message: "Choose an image to upload." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "Images must be under 1 MB in this demo environment." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, message: "Only JPEG, PNG or WebP images are accepted." };
  const stored = await getStorage().put(user.id, { bytes, contentType: type });
  const id = uid("ph_");
  p.photos.push({ id, url: `/api/photo/${id}`, path: stored.path, status: "pending", isPrimary: p.photos.length === 0, createdAt: new Date().toISOString() });
  void store;
  return { ok: true, message: "Photo uploaded. It will appear to other members once approved by our moderators." };
}

export async function removePhoto(userId: string, photoId: string) {
  const p = await getOwnProfile(userId);
  const ph = p.photos.find((x) => x.id === photoId);
  if (!ph) return;
  if (ph.path) await getStorage().remove(ph.path);
  p.photos = p.photos.filter((x) => x.id !== photoId);
  if (!p.photos.some((x) => x.isPrimary) && p.photos[0]) p.photos[0].isPrimary = true;
}

export async function setPrimaryPhoto(userId: string, photoId: string) {
  const p = await getOwnProfile(userId);
  const ph = p.photos.find((x) => x.id === photoId);
  if (!ph || ph.status === "rejected") return;
  p.photos.forEach((x) => (x.isPrimary = x.id === photoId));
}

/** Resolves a photo for the access-controlled image route. */
export async function resolvePhoto(viewer: User, photoId: string): Promise<{ path: string } | null> {
  const store = await getStore();
  for (const p of store.profiles.values()) {
    const ph = p.photos.find((x) => x.id === photoId);
    if (!ph || !ph.path) continue;
    if (viewer.role === "admin" || p.userId === viewer.id) return { path: ph.path };
    if (ph.status === "approved" && canViewProfile(store, viewer, p)) return { path: ph.path };
  }
  return null;
}

/* ---------- dashboard data ---------- */

export async function dashboardSummary(user: User) {
  const store = await getStore();
  const ent = entitlementsOfUser(store, user.id);
  const profile = await getOwnProfile(user.id);
  const unreadMessages = store.messages.filter((m) => m.senderId !== user.id && !m.readAt && store.conversations.get(m.conversationId)?.participantIds.includes(user.id)).length;
  const newInterests = store.interests.filter((i) => i.toId === user.id && !i.seen);
  const views = store.views.filter((v) => v.targetId === user.id && store.profiles.get(v.viewerId) && !isBlockedEitherWay(store, user.id, v.viewerId));
  const viewers = views.slice(0, ent.viewers === "full" ? 20 : ent.viewers === "recent" ? 5 : 0).map((v) => ({
    ...toPublic(store, user, store.profiles.get(v.viewerId)!), at: v.at,
  }));
  return {
    completion: profileCompletion(profile),
    unreadMessages,
    newInterests: newInterests.map((i) => toPublic(store, user, store.profiles.get(i.fromId)!)).filter(Boolean),
    favouriteCount: store.favourites.filter((f) => f.userId === user.id).length,
    viewCount: views.length,
    viewers,
    viewerAccess: ent.viewers,
    unreadNotifications: store.notifications.filter((n) => n.userId === user.id && !n.read).length,
    profile,
  };
}

export async function listFavourites(user: User): Promise<PublicProfile[]> {
  const store = await getStore();
  return store.favourites
    .filter((f) => f.userId === user.id)
    .map((f) => store.profiles.get(f.targetId))
    .filter((p): p is Profile => Boolean(p) && canViewProfile(store, user, p!))
    .map((p) => toPublic(store, user, p));
}

export async function listBlocked(user: User): Promise<{ id: string; name: string }[]> {
  const store = await getStore();
  return store.blocks.filter((b) => b.blockerId === user.id).map((b) => ({ id: b.blockedId, name: store.profiles.get(b.blockedId)?.displayName ?? "Member" }));
}

export async function listNotifications(user: User) {
  const store = await getStore();
  return store.notifications.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
}

export async function markNotificationsRead(userId: string) {
  const store = await getStore();
  store.notifications.forEach((n) => { if (n.userId === userId) n.read = true; });
  store.interests.forEach((i) => { if (i.toId === userId) i.seen = true; });
}

/* ---------- data rights ---------- */

export async function exportUserData(user: User) {
  const store = await getStore();
  const profile = store.profiles.get(user.id);
  const convIds = [...store.conversations.values()].filter((c) => c.participantIds.includes(user.id)).map((c) => c.id);
  return {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email, createdAt: user.createdAt, status: user.status, consents: user.consents, ageVerification: user.ageVerification },
    profile,
    subscription: store.subscriptions.get(user.id),
    payments: store.payments.filter((p) => p.userId === user.id),
    favourites: store.favourites.filter((f) => f.userId === user.id),
    blocks: store.blocks.filter((b) => b.blockerId === user.id),
    messages: store.messages.filter((m) => convIds.includes(m.conversationId)),
    notifications: store.notifications.filter((n) => n.userId === user.id),
    reportsFiled: store.reports.filter((r) => r.reporterId === user.id),
  };
}

export async function deleteAccount(user: User): Promise<void> {
  const store = await getStore();
  const id = user.id;
  const p = store.profiles.get(id);
  for (const ph of p?.photos ?? []) if (ph.path) await getStorage().remove(ph.path);
  const convIds = new Set([...store.conversations.values()].filter((c) => c.participantIds.includes(id)).map((c) => c.id));
  convIds.forEach((c) => store.conversations.delete(c));
  store.messages = store.messages.filter((m) => !convIds.has(m.conversationId));
  store.favourites = store.favourites.filter((f) => f.userId !== id && f.targetId !== id);
  store.interests = store.interests.filter((i) => i.fromId !== id && i.toId !== id);
  store.blocks = store.blocks.filter((b) => b.blockerId !== id && b.blockedId !== id);
  store.views = store.views.filter((v) => v.viewerId !== id && v.targetId !== id);
  store.notifications = store.notifications.filter((n) => n.userId !== id);
  store.subscriptions.delete(id);
  store.payments = store.payments.filter((x) => x.userId !== id);
  store.profiles.delete(id);
  store.users.delete(id);
}
