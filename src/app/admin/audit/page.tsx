import type { Metadata } from "next";
import { Table, td, th } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { listAudit } from "@/server/services/admin";
import { requireAdmin } from "@/server/session";
export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const rows = await listAudit(await requireAdmin());
  return (
    <div className="space-y-6"><h1 className="text-4xl">Audit log</h1><p className="text-sm text-muted">Every administrative action is recorded here.</p>
      <Table><thead><tr><th className={th}>When</th><th className={th}>Admin</th><th className={th}>Action</th><th className={th}>Target</th><th className={th}>Detail</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td className={td}>{formatDateTime(r.at)}</td><td className={`${td} font-mono text-xs`}>{r.adminId}</td><td className={`${td} font-mono text-xs text-champagne`}>{r.action}</td><td className={`${td} font-mono text-xs`}>{r.targetType}:{r.targetId}</td><td className={`${td} text-muted`}>{r.detail}</td></tr>)}</tbody></Table>
    </div>
  );
}
