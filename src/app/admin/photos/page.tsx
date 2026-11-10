import type { Metadata } from "next";
import Image from "next/image";
import { photoDecisionAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/forms";
import { timeAgo } from "@/lib/utils";
import { listPendingPhotos } from "@/server/services/admin";
import { requireAdmin } from "@/server/session";
export const metadata: Metadata = { title: "Photo moderation" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const rows = await listPendingPhotos(await requireAdmin());
  return (
    <div className="space-y-6"><h1 className="text-4xl">Photo moderation</h1>
      {rows.length === 0 ? <div className="card p-8 text-muted">The queue is empty.</div> : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{rows.map((r) => (
          <li key={r.photoId} className="card overflow-hidden"><div className="relative aspect-[3/4]"><Image src={r.url} alt={`Pending photo from ${r.name}`} fill unoptimized className="object-cover" /></div>
            <div className="space-y-3 p-4"><p>{r.name} <span className="text-xs text-muted">· {timeAgo(r.createdAt)}</span></p>
              <div className="flex gap-2">{(["approved", "rejected"] as const).map((d) => <form key={d} action={photoDecisionAction}><input type="hidden" name="userId" value={r.userId} /><input type="hidden" name="photoId" value={r.photoId} /><input type="hidden" name="decision" value={d} /><SubmitButton className={`btn btn-sm ${d === "approved" ? "btn-primary" : "btn-danger"}`}>{d === "approved" ? "Approve" : "Reject"}</SubmitButton></form>)}</div></div></li>))}</ul>)}
    </div>
  );
}
