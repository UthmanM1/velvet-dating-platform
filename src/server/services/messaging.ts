import { entitlementsFor } from "@/lib/plans";
import type { Message, PublicProfile, User } from "@/lib/types";
import { cleanText, uid } from "@/lib/utils";
import { AUTO_REPLIES, conversationId, getStore, type Store } from "../store";
import { tierOf } from "./billing";
import { canViewProfile, isBlockedEitherWay, toPublic } from "./members";

/** Demo mode: deliver any simulated replies that have come due. */
function deliverDueReplies(store: Store) {
  const now = Date.now();
  const due = store.pendingReplies.filter((r) => r.dueAt <= now);
  if (!due.length) return;
  store.pendingReplies = store.pendingReplies.filter((r) => r.dueAt > now);
  for (const r of due) {
    if (isBlockedEitherWay(store, r.from, r.to)) continue;
    store.messages.push({ id: uid("msg_"), conversationId: r.conversationId, senderId: r.from, body: r.body, createdAt: new Date().toISOString() });
    const name = store.profiles.get(r.from)?.displayName ?? "A member";
    store.notifications.unshift({ id: uid("n_"), userId: r.to, type: "message", title: `New message from ${name}`, body: "Open your conversation to reply.", href: `/dashboard/messages/${r.conversationId}`, read: false, createdAt: new Date().toISOString() });
  }
}

export interface ConversationSummary {
  id: string;
  other: PublicProfile;
  lastMessage: string;
  lastAt: string;
  unread: number;
  lastFromMe: boolean;
}

export async function listConversations(user: User): Promise<ConversationSummary[]> {
  const store = await getStore();
  deliverDueReplies(store);
  const out: ConversationSummary[] = [];
  for (const c of store.conversations.values()) {
    if (!c.participantIds.includes(user.id)) continue;
    const otherId = c.participantIds.find((x) => x !== user.id)!;
    const op = store.profiles.get(otherId);
    const ou = store.users.get(otherId);
    if (!op || !ou || ou.status !== "active" || isBlockedEitherWay(store, user.id, otherId)) continue;
    const msgs = store.messages.filter((m) => m.conversationId === c.id);
    const last = msgs[msgs.length - 1];
    if (!last) continue;
    out.push({
      id: c.id, other: toPublic(store, user, op), lastMessage: last.body, lastAt: last.createdAt,
      unread: msgs.filter((m) => m.senderId !== user.id && !m.readAt).length, lastFromMe: last.senderId === user.id,
    });
  }
  return out.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export async function getThread(user: User, convId: string): Promise<{ other: PublicProfile; messages: Message[] } | null> {
  const store = await getStore();
  deliverDueReplies(store);
  const c = store.conversations.get(convId);
  if (!c || !c.participantIds.includes(user.id)) return null;
  const otherId = c.participantIds.find((x) => x !== user.id)!;
  const op = store.profiles.get(otherId);
  if (!op || isBlockedEitherWay(store, user.id, otherId)) return null;
  const now = new Date().toISOString();
  const all = store.messages.filter((m) => m.conversationId === convId);
  all.forEach((m) => { if (m.senderId !== user.id && !m.readAt) m.readAt = now; });
  return { other: toPublic(store, user, op), messages: all.slice(-200) };
}

export async function sendMessage(user: User, toId: string, rawBody: string): Promise<{ ok: boolean; message?: string; conversationId?: string }> {
  const store = await getStore();
  const target = store.profiles.get(toId);
  if (!target || toId === user.id) return { ok: false, message: "Member not found." };
  if (!canViewProfile(store, user, target)) return { ok: false, message: "You can't message this member." };
  const body = cleanText(rawBody, 2000);
  if (!body) return { ok: false, message: "Write a message first." };

  const ent = entitlementsFor(tierOf(store, user.id));
  const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
  const sentToday = store.messages.filter((m) => m.senderId === user.id && new Date(m.createdAt) >= startOfDay).length;
  if (sentToday >= ent.messagesPerDay) return { ok: false, message: `You have reached today's allowance of ${ent.messagesPerDay} messages. Upgrade your plan for more.` };

  const cid = conversationId(user.id, toId);
  if (!store.conversations.has(cid)) store.conversations.set(cid, { id: cid, participantIds: [user.id, toId], createdAt: new Date().toISOString() });
  store.messages.push({ id: uid("msg_"), conversationId: cid, senderId: user.id, body, createdAt: new Date().toISOString() });

  const me = store.profiles.get(user.id);
  store.notifications.unshift({ id: uid("n_"), userId: toId, type: "message", title: `New message from ${me?.displayName ?? "a member"}`, body: "Open your conversation to reply.", href: `/dashboard/messages/${cid}`, read: false, createdAt: new Date().toISOString() });

  // Demo mode only: seeded members answer after a short delay so the experience can be explored alone.
  const targetUser = store.users.get(toId);
  if (targetUser?.isDemo && toId !== "demo_member") {
    store.pendingReplies.push({ conversationId: cid, from: toId, to: user.id, body: AUTO_REPLIES[store.messages.length % AUTO_REPLIES.length], dueAt: Date.now() + 4000 });
  }
  return { ok: true, conversationId: cid };
}

export async function unreadCount(user: User): Promise<number> {
  const store = await getStore();
  deliverDueReplies(store);
  return store.messages.filter((m) => m.senderId !== user.id && !m.readAt && store.conversations.get(m.conversationId)?.participantIds.includes(user.id)).length;
}
