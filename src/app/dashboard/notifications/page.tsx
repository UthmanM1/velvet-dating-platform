import type { Metadata } from "next";
import Link from "next/link";
import { markNotificationsReadAction } from "@/app/actions/member";
import { timeAgo } from "@/lib/utils";
import { listNotifications } from "@/server/services/members";
import { requireUser } from "@/server/session";
export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await requireUser();
  const items = await listNotifications(user);
  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="text-4xl">Notifications</h1>{items.some((n) => !n.read) && <form action={markNotificationsReadAction}><button className="btn btn-ghost btn-sm">Mark all as read</button></form>}</div>
      {items.length === 0 ? <div className="card mt-6 p-10 text-center text-muted">You&apos;re all caught up.</div> : (
        <ul className="card mt-6 divide-y divide-line/70">{items.map((n) => (
          <li key={n.id} className="flex items-start gap-3 p-4">
            <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-line" : "bg-rose"}`} aria-label={n.read ? "Read" : "Unread"} />
            <div className="flex-1"><p>{n.href ? <Link href={n.href} className="hover:text-champagne">{n.title}</Link> : n.title}</p><p className="text-sm text-muted">{n.body}</p></div>
            <span className="text-xs text-muted">{timeAgo(n.createdAt)}</span>
          </li>))}</ul>)}
    </div>
  );
}
