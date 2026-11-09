import type { Metadata } from "next";
import Link from "next/link";
import { cancelSubscriptionAction, changePlanAction, resumeSubscriptionAction } from "@/app/actions/member";
import { SubmitButton } from "@/components/forms";
import { Alert, Table, td, th } from "@/components/ui";
import { config } from "@/lib/config";
import { formatPrice, getPlan, getPlans, tierRank } from "@/lib/plans";
import { formatDate } from "@/lib/utils";
import { billingHistory, currentSubscription } from "@/server/services/billing";
import { requireUser } from "@/server/session";
import { getStore } from "@/server/store";
export const metadata: Metadata = { title: "Subscription" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string; checkout?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const store = await getStore();
  const sub = currentSubscription(store, user.id);
  const payments = await billingHistory(user.id);
  const plan = getPlan(sub.tier);
  const stripeMode = config.stripe.configured;
  return (
    <div className="space-y-8">
      <h1 className="text-4xl">Subscription</h1>
      {sp.notice && <Alert tone="success">{sp.notice}</Alert>}
      {sp.error && <Alert tone="error">{sp.error}</Alert>}
      {sp.checkout === "success" && <Alert tone="success">Checkout complete. Your plan updates as soon as Stripe confirms the payment.</Alert>}
      <Alert>{stripeMode ? "Stripe test mode is active. Use Stripe's test cards; no real money moves." : "Demo billing: plan changes take effect immediately and no payment is taken. Add Stripe test keys to enable hosted test-mode checkout."}</Alert>
      <section className="card grid gap-6 p-6 sm:grid-cols-4">
        <div><p className="eyebrow">Plan</p><p className="mt-2 font-display text-4xl text-champagne">{plan.name}</p></div>
        <div><p className="eyebrow">Status</p><p className="mt-2 capitalize">{sub.cancelAtPeriodEnd ? "Cancelling" : sub.status.replace("_", " ")}</p></div>
        <div><p className="eyebrow">{sub.cancelAtPeriodEnd ? "Ends on" : "Renews on"}</p><p className="mt-2">{sub.tier === "silver" ? "n/a (free)" : formatDate(sub.currentPeriodEnd)}</p></div>
        <div><p className="eyebrow">Price</p><p className="mt-2">{formatPrice(plan.pricePence)}{plan.pricePence > 0 && " / month"}</p></div>
        {sub.pendingTier && <p className="text-sm text-muted sm:col-span-4">Scheduled change: moving to {getPlan(sub.pendingTier).name} on {formatDate(sub.currentPeriodEnd)}.</p>}
      </section>
      <section>
        <h2 className="mb-4 text-2xl">Change plan</h2>
        <div className="grid gap-4 md:grid-cols-3">{getPlans().map((p) => (
          <div key={p.tier} className={`card p-5 ${p.tier === sub.tier ? "border-gold/50" : ""}`}>
            <p className="font-display text-2xl">{p.name}</p><p className="text-sm text-muted">{formatPrice(p.pricePence)}{p.pricePence > 0 && " / month"}</p>
            <div className="mt-4">{p.tier === sub.tier ? <span className="text-sm text-champagne">Current plan</span> : <form action={changePlanAction}><input type="hidden" name="tier" value={p.tier} /><SubmitButton className="btn btn-ghost btn-sm">{tierRank(p.tier) > tierRank(sub.tier) ? "Upgrade" : "Downgrade"} to {p.name}</SubmitButton></form>}</div>
          </div>))}</div>
        <div className="mt-5 flex gap-3">
          {sub.tier !== "silver" && !sub.cancelAtPeriodEnd && <form action={cancelSubscriptionAction}><SubmitButton className="btn btn-danger btn-sm">Cancel membership</SubmitButton></form>}
          {sub.cancelAtPeriodEnd && <form action={resumeSubscriptionAction}><SubmitButton className="btn btn-primary btn-sm">Keep my membership</SubmitButton></form>}
          <Link href="/plans" className="btn btn-ghost btn-sm">Compare plans</Link>
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-2xl">Billing history</h2>
        {payments.length === 0 ? <div className="card p-6 text-sm text-muted">No payments yet.</div> : (
          <Table><thead><tr><th className={th}>Date</th><th className={th}>Description</th><th className={th}>Amount</th><th className={th}>Status</th></tr></thead>
            <tbody>{payments.map((p) => <tr key={p.id}><td className={td}>{formatDate(p.createdAt)}</td><td className={td}>{p.description}</td><td className={td}>{formatPrice(p.amountPence)}</td><td className={`${td} capitalize`}>{p.status}</td></tr>)}</tbody></Table>)}
      </section>
    </div>
  );
}
