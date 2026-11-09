import type { User } from "@/lib/types";
import { getThread, sendMessage } from "@/server/services/messaging";

/** Shapes thread data for the client: only fields the browser needs, never emails or DOBs. */
export async function getFullThreadForRoute(user: User, conversationId: string) {
  const t = await getThread(user, conversationId);
  if (!t) return null;
  return {
    other: { id: t.other.id, displayName: t.other.displayName, online: t.other.online, lastActiveLabel: t.other.lastActiveLabel },
    messages: t.messages.map((m) => ({ id: m.id, mine: m.senderId === user.id, body: m.body, createdAt: m.createdAt, read: Boolean(m.readAt) })),
  };
}

export const send = sendMessage;
