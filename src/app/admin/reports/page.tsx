import type { Metadata } from "next";
import { resolveReportAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/forms";
import { Table, td, th } from "@/components/ui";
import { REPORT_REASON_LABEL } from "@/lib/reference";
import { timeAgo } from "@/lib/utils";
import { listReports } from "@/server/services/admin";
import { requireAdmin } from "@/server/session";
export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const rows = await listReports(await requireAdmin());
  return (
    <div className="space-y-6"><h1 className="text-4xl">Reports</h1>
      {rows.length === 0 ? <div className="card p-8 text-muted">No reports.</div> : (
        <Table><thead><tr><th className={th}>Report</th><th className={th}>Reason</th><th className={th}>Status</th><th className={th}>Action</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}><td className={td}><strong className="font-normal">{r.reporterName}</strong> reported <strong className="font-normal text-champagne">{r.targetName}</strong><div className="text-xs text-muted">{timeAgo(r.createdAt)} · account {r.targetStatus}</div></td>
              <td className={td}>{REPORT_REASON_LABEL[r.reason]}<div className="max-w-xs text-xs text-muted">{r.details}</div></td>
              <td className={`${td} capitalize`}>{r.status}</td>
              <td className={td}>{r.status === "open" ? <div className="flex gap-2"><form action={resolveReportAction}><input type="hidden" name="reportId" value={r.id} /><input type="hidden" name="outcome" value="resolved" /><SubmitButton className="btn btn-primary btn-sm">Resolve</SubmitButton></form><form action={resolveReportAction}><input type="hidden" name="reportId" value={r.id} /><input type="hidden" name="outcome" value="dismissed" /><SubmitButton className="btn btn-ghost btn-sm">Dismiss</SubmitButton></form></div> : <span className="text-xs text-muted">Closed</span>}</td></tr>))}</tbody></Table>)}
    </div>
  );
}
