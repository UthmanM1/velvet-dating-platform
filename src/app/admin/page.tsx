import { StatTile } from "@/components/ui";
import { formatPrice } from "@/lib/plans";
import { analytics } from "@/server/services/admin";
import { requireAdmin } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function Page() {
  const a = await analytics(await requireAdmin());
  const max = Math.max(1, ...a.revenueByMonth.map(([, v]) => v));
  return (
    <div className="space-y-8">
      <h1 className="text-4xl">Platform overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Members" value={a.totalMembers} hint={`${a.realMembers} real · ${a.demoMembers} demo`} href="/admin/members" />
        <StatTile label="Active" value={a.active} hint={`${a.suspended} suspended · ${a.banned} banned`} />
        <StatTile label="New this week" value={a.newThisWeek} />
        <StatTile label="Verified profiles" value={a.verifiedProfiles} />
        <StatTile label="Open reports" value={a.openReports} href="/admin/reports" />
        <StatTile label="Photos to review" value={a.pendingPhotos} href="/admin/photos" />
        <StatTile label="Messages sent" value={a.messages} />
        <StatTile label="Est. MRR" value={formatPrice(a.mrrPence)} hint="Active paid plans × list price" href="/admin/subscriptions" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6"><h2 className="text-2xl">Members by plan</h2>
          <ul className="mt-4 space-y-3">{(["silver", "gold", "platinum"] as const).map((t) => (
            <li key={t}><div className="mb-1 flex justify-between text-sm capitalize"><span>{t}</span><span className="text-muted">{a.byTier[t]}</span></div><div className="h-2 rounded-full bg-line"><div className="h-full rounded-full bg-gradient-to-r from-burgundy to-champagne" style={{ width: `${(a.byTier[t] / Math.max(1, a.totalMembers)) * 100}%` }} /></div></li>))}</ul></section>
        <section className="card p-6"><h2 className="text-2xl">Revenue</h2><p className="mt-2 text-sm text-muted">Total recorded: <span className="text-champagne">{formatPrice(a.totalRevenuePence)}</span> (demo payments, no real money)</p>
          <div className="mt-5 flex h-32 items-end gap-3" role="img" aria-label="Revenue by month">{a.revenueByMonth.map(([m, v]) => <div key={m} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t bg-gradient-to-t from-wine to-champagne/80" style={{ height: `${(v / max) * 100}%` }} title={formatPrice(v)} /><span className="text-[0.65rem] text-muted">{m.slice(5)}</span></div>)}</div></section>
      </div>
    </div>
  );
}
