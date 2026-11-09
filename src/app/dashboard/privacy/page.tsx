import type { Metadata } from "next";
import { unblockAction } from "@/app/actions/member";
import { PrivacyForm, SubmitButton } from "@/components/forms";
import { entitlementsOfUser } from "@/server/services/billing";
import { getOwnProfile, listBlocked } from "@/server/services/members";
import { requireUser } from "@/server/session";
import { getStore } from "@/server/store";
export const metadata: Metadata = { title: "Privacy" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await requireUser();
  const [profile, blocked, store] = await Promise.all([getOwnProfile(user.id), listBlocked(user), getStore()]);
  const consent = (t: string) => user.consents.find((c) => c.type === t)?.granted ?? false;
  return (
    <div className="space-y-8">
      <h1 className="text-4xl">Privacy controls</h1>
      <section className="card p-6"><PrivacyForm profile={profile} marketing={consent("marketing")} analytics={consent("analytics")} canIncognito={entitlementsOfUser(store, user.id).incognito} /></section>
      <section className="card p-6">
        <h2 className="text-2xl">Blocked members</h2>
        {blocked.length === 0 ? <p className="mt-3 text-sm text-muted">You haven&apos;t blocked anyone.</p> : <ul className="mt-4 divide-y divide-line/70">{blocked.map((b) => <li key={b.id} className="flex items-center justify-between py-3"><span>{b.name}</span><form action={unblockAction}><input type="hidden" name="targetId" value={b.id} /><SubmitButton className="btn btn-ghost btn-sm">Unblock</SubmitButton></form></li>)}</ul>}
      </section>
    </div>
  );
}
