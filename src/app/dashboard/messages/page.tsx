import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { OnlineDot } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { listConversations } from "@/server/services/messaging";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await requireUser();
  const convs = await listConversations(user);
  return (
    <div>
      <h1 className="text-4xl">Messages</h1>
      {convs.length === 0 ? <div className="card mt-6 p-10 text-center text-muted">No conversations yet. <Link href="/discover" className="text-champagne underline">Find someone to say hello to.</Link></div> : (
        <ul className="card mt-6 divide-y divide-line/70">{convs.map((c) => (
          <li key={c.id}><Link href={`/dashboard/messages/${c.id}`} className="flex items-center gap-4 p-4 transition hover:bg-raised/60">
            <Image src={c.other.primaryPhoto} alt="" width={52} height={52} unoptimized className="h-13 w-13 rounded-full object-cover" />
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-lg">{c.other.displayName}<OnlineDot online={c.other.online} /></p><span className="text-xs text-muted">{timeAgo(c.lastAt)}</span></div>
              <p className={`truncate text-sm ${c.unread ? "text-ivory" : "text-muted"}`}>{c.lastFromMe && "You: "}{c.lastMessage}</p></div>
            {c.unread > 0 && <span className="rounded-full bg-burgundy px-2.5 py-1 text-xs" aria-label={`${c.unread} unread`}>{c.unread}</span>}
          </Link></li>))}</ul>)}
    </div>
  );
}
