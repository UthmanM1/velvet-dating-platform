import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, MessageCircle, Sparkles } from "lucide-react";
import { StatTile } from "@/components/ui";
import { getPlan } from "@/lib/plans";
import { formatDate } from "@/lib/utils";
import { currentSubscription } from "@/server/services/billing";
import { dashboardSummary } from "@/server/services/members";
import { requireUser } from "@/server/session";
import { getStore } from "@/server/store";

export default async function DashboardHome() {
  const user = await requireUser();
  const [s, store] = await Promise.all([dashboardSummary(user), getStore()]);
  const sub = currentSubscription(store, user.id);
  return (
    <div className="space-y-8">
      <div><p className="eyebrow">Welcome back</p><h1 className="text-5xl">{s.profile.displayName}</h1></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Unread messages" value={s.unreadMessages} href="/dashboard/messages" />
        <StatTile label="New interests" value={s.newInterests.length} href="/dashboard/notifications" />
        <StatTile label="Favourites" value={s.favouriteCount} href="/dashboard/favourites" />
        <StatTile label="Profile views" value={s.viewCount} hint={s.viewerAccess === "count" ? "Upgrade to see who" : "Recent visitors below"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-2xl">Profile completion</h2>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={s.completion.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion"><div className="h-full rounded-full bg-gradient-to-r from-burgundy to-champagne transition-all" style={{ width: `${s.completion.percent}%` }} /></div>
          <p className="mt-2 text-sm text-muted">{s.completion.percent}% complete</p>
          {s.completion.missing.length > 0 && <ul className="mt-4 space-y-1.5 text-sm text-muted">{s.completion.missing.map((m) => <li key={m} className="flex gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-gold" aria-hidden />{m}</li>)}</ul>}
          <Link href="/dashboard/profile" className="btn btn-ghost btn-sm mt-5">Edit profile</Link>
        </section>
        <section className="card p-6">
          <h2 className="text-2xl">Subscription</h2>
          <p className="mt-3 font-display text-4xl text-champagne">{getPlan(sub.tier).name}</p>
          <p className="mt-1 text-sm text-muted">{sub.cancelAtPeriodEnd ? `Ends ${formatDate(sub.currentPeriodEnd)}` : sub.tier === "silver" ? "Free plan" : `Renews ${formatDate(sub.currentPeriodEnd)}`}</p>
          <Link href="/dashboard/subscription" className="btn btn-ghost btn-sm mt-5">Manage subscription</Link>
        </section>
      </div>
      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-2xl"><Heart className="h-5 w-5 text-rose" aria-hidden />New interests</h2>
        {s.newInterests.length === 0 ? <p className="mt-3 text-sm text-muted">No new interests right now.</p> : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">{s.newInterests.map((m) => (
            <li key={m.id}><Link href={`/discover/${m.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-gold/40"><Image src={m.primaryPhoto} alt="" width={44} height={44} unoptimized className="h-11 w-11 rounded-full object-cover" /><span><span className="block">{m.displayName}, {m.age}</span><span className="text-xs text-muted">{m.city}</span></span></Link></li>))}</ul>)}
      </section>
      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-2xl"><Eye className="h-5 w-5 text-gold" aria-hidden />Who viewed you</h2>
        {s.viewerAccess === "count" ? <p className="mt-3 text-sm text-muted">{s.viewCount} member{s.viewCount === 1 ? "" : "s"} viewed your profile recently. <Link href="/plans" className="text-champagne underline">Upgrade to Gold</Link> to see who.</p> : s.viewers.length === 0 ? <p className="mt-3 text-sm text-muted">No visitors yet.</p> : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">{s.viewers.map((m) => (
            <li key={m.id}><Link href={`/discover/${m.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-gold/40"><Image src={m.primaryPhoto} alt="" width={44} height={44} unoptimized className="h-11 w-11 rounded-full object-cover" /><span><span className="block">{m.displayName}, {m.age}</span><span className="text-xs text-muted">{m.city}</span></span></Link></li>))}</ul>)}
      </section>
      <p className="flex items-center gap-2 text-xs text-muted"><MessageCircle className="h-3.5 w-3.5" aria-hidden />Messages are private between you and the recipient.</p>
    </div>
  );
}
