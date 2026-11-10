import type { Metadata } from "next";
import Link from "next/link";
import { accountStatusAction, hideProfileAction, verifyProfileAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/forms";
import { Table, td, th } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { listMembers } from "@/server/services/admin";
import { requireAdmin } from "@/server/session";
export const metadata: Metadata = { title: "Members" };
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows = await listMembers(await requireAdmin(), q);
  const tone = { active: "text-emerald-300", suspended: "text-amber-300", banned: "text-rose", pending_verification: "text-muted" } as const;
  return (
    <div className="space-y-6">
      <h1 className="text-4xl">Members</h1>
      <form className="flex max-w-md gap-2"><input name="q" defaultValue={q} placeholder="Search name, email or id" className="input" aria-label="Search members" /><button className="btn btn-ghost">Search</button></form>
      <Table><thead><tr><th className={th}>Member</th><th className={th}>Plan</th><th className={th}>Status</th><th className={th}>Joined</th><th className={th}>Actions</th></tr></thead>
        <tbody>{rows.map((m) => (
          <tr key={m.id}>
            <td className={td}><Link href={`/discover/${m.id}`} className="hover:text-champagne">{m.name}, {m.age}</Link> {m.verified && <span className="chip ml-1">Verified</span>} {m.isDemo && <span className="chip ml-1">Demo</span>}<div className="text-xs text-muted">{m.email} · {m.city}</div>{m.note && <div className="text-xs text-amber-300">Note: {m.note}</div>}</td>
            <td className={`${td} capitalize`}>{m.tier}</td><td className={`${td} capitalize ${tone[m.status]}`}>{m.status.replace("_", " ")}</td><td className={td}>{formatDate(m.createdAt)}</td>
            <td className={td}>
              <div className="flex flex-wrap items-center gap-2">
                <form action={verifyProfileAction}><input type="hidden" name="userId" value={m.id} /><input type="hidden" name="verified" value={m.verified ? "0" : "1"} /><SubmitButton className="btn btn-ghost btn-sm">{m.verified ? "Unverify" : "Verify"}</SubmitButton></form>
                <form action={hideProfileAction}><input type="hidden" name="userId" value={m.id} /><input type="hidden" name="hidden" value="1" /><SubmitButton className="btn btn-ghost btn-sm">Hide profile</SubmitButton></form>
                {m.status === "active" ? (<>
                  <form action={accountStatusAction} className="flex gap-1"><input type="hidden" name="userId" value={m.id} /><input type="hidden" name="status" value="suspended" /><input name="note" placeholder="Reason" aria-label="Reason" className="input !w-28 !py-1 text-xs" /><SubmitButton className="btn btn-ghost btn-sm">Suspend</SubmitButton></form>
                  <form action={accountStatusAction}><input type="hidden" name="userId" value={m.id} /><input type="hidden" name="status" value="banned" /><SubmitButton className="btn btn-danger btn-sm">Ban</SubmitButton></form></>) : (
                  <form action={accountStatusAction}><input type="hidden" name="userId" value={m.id} /><input type="hidden" name="status" value="active" /><SubmitButton className="btn btn-primary btn-sm">Reinstate</SubmitButton></form>)}
              </div>
            </td>
          </tr>))}</tbody></Table>
    </div>
  );
}
