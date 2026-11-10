import type { Metadata } from "next";
import { adminTierAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/forms";
import { Table, td, th } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { listSubscriptions } from "@/server/services/admin";
import { requireAdmin } from "@/server/session";
export const metadata: Metadata = { title: "Subscriptions" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const rows = await listSubscriptions(await requireAdmin());
  return (
    <div className="space-y-6"><h1 className="text-4xl">Subscriptions</h1>
      <Table><thead><tr><th className={th}>Member</th><th className={th}>Plan</th><th className={th}>Status</th><th className={th}>Period end</th><th className={th}>Set plan (no charge)</th></tr></thead>
        <tbody>{rows.map((s) => (
          <tr key={s.userId}><td className={td}>{s.name} {s.isDemo && <span className="chip ml-1">Demo</span>}<div className="text-xs text-muted">{s.email}</div></td><td className={`${td} capitalize`}>{s.tier}{s.pendingTier && <span className="text-xs text-muted"> → {s.pendingTier}</span>}</td>
            <td className={`${td} capitalize`}>{s.cancelAtPeriodEnd ? "cancelling" : s.status.replace("_", " ")} <span className="text-xs text-muted">({s.provider})</span></td><td className={td}>{formatDate(s.currentPeriodEnd)}</td>
            <td className={td}><form action={adminTierAction} className="flex gap-2"><input type="hidden" name="userId" value={s.userId} /><select name="tier" defaultValue={s.tier} aria-label="Plan" className="input !w-28 !py-1 text-xs"><option value="silver">Silver</option><option value="gold">Gold</option><option value="platinum">Platinum</option></select><SubmitButton className="btn btn-ghost btn-sm">Apply</SubmitButton></form></td></tr>))}</tbody></Table>
    </div>
  );
}
