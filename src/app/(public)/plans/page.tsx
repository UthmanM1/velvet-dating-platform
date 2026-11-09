import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { changePlanAction } from "@/app/actions/member";
import { SubmitButton } from "@/components/forms";
import { LinkButton, SectionHeading } from "@/components/ui";
import { formatPrice, getPlans, tierRank } from "@/lib/plans";
import { currentSubscription } from "@/server/services/billing";
import { getStore } from "@/server/store";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Membership plans" };

export default async function PlansPage() {
  const plans = getPlans();
  const user = await getCurrentUser();
  const current = user ? currentSubscription(await getStore(), user.id).tier : null;
  const rows: [string, (p: (typeof plans)[number]) => string | boolean][] = [
    ["Member discovery", (p) => (p.tier === "silver" ? "Basic (12 per page)" : p.tier === "gold" ? "Expanded (24 per page)" : "Premium")],
    ["Advanced search (distance, interests, activity)", (p) => p.entitlements.advancedSearch],
    ["Messages per day", (p) => String(p.entitlements.messagesPerDay)],
    ["Profile interactions per day", (p) => String(p.entitlements.interestsPerDay)],
    ["Favourites", (p) => String(p.entitlements.maxFavourites)],
    ["See who viewed your profile", (p) => (p.entitlements.viewers === "count" ? "Count only" : p.entitlements.viewers === "recent" ? "Recent visitors" : "Full history")],
    ["Priority visibility in results", (p) => p.entitlements.priorityVisibility],
    ["Incognito browsing & advanced privacy", (p) => p.entitlements.incognito],
    ["Exclusive member features", (p) => p.entitlements.exclusiveFeatures],
  ];
  return (
    <div className="container-x py-16">
      <SectionHeading eyebrow="Membership" title="Three ways to belong." center>Prices are configurable placeholders, not final commercial pricing. Billing runs in demo mode unless Stripe test keys are configured. No live charges are ever made.</SectionHeading>
      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = current === p.tier;
          return (
            <div key={p.tier} className={`card flex flex-col p-7 ${p.tier === "gold" ? "border-gold/50 shadow-[0_0_60px_-20px_rgba(201,167,102,.45)]" : ""}`}>
              <div className="flex items-center justify-between"><p className="eyebrow">{p.name}</p>{p.tier === "gold" && <span className="chip border-gold/40 text-champagne">Most popular</span>}</div>
              <p className="mt-3 font-display text-5xl text-champagne">{formatPrice(p.pricePence)}<span className="ml-1 font-sans text-sm text-muted">{p.pricePence > 0 && "/ month"}</span></p>
              <p className="mt-2 text-sm text-muted">{p.blurb}</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />{f}</li>)}</ul>
              <div className="mt-7">
                {!user ? <LinkButton href="/register" variant={p.tier === "gold" ? "gold" : "ghost"} className="w-full">Join to choose {p.name}</LinkButton>
                  : isCurrent ? <span className="btn btn-ghost w-full cursor-default opacity-70">Your current plan</span>
                  : <form action={changePlanAction}><input type="hidden" name="tier" value={p.tier} /><SubmitButton className={`btn w-full ${p.tier === "gold" ? "btn-gold" : "btn-ghost"}`}>{current && tierRank(p.tier) > tierRank(current) ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}</SubmitButton></form>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="card mt-14 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Plan comparison</caption>
          <thead><tr><th className="px-5 py-4 text-xs uppercase tracking-wider text-muted">Feature</th>{plans.map((p) => <th key={p.tier} scope="col" className="px-5 py-4 font-display text-2xl text-champagne">{p.name}</th>)}</tr></thead>
          <tbody>{rows.map(([label, fn]) => (
            <tr key={label} className="border-t border-line/60"><th scope="row" className="px-5 py-3.5 font-normal text-ivory/90">{label}</th>
              {plans.map((p) => { const v = fn(p); return <td key={p.tier} className="px-5 py-3.5 text-muted">{v === true ? <Check className="h-4 w-4 text-gold" aria-label="Included" /> : v === false ? <Minus className="h-4 w-4" aria-label="Not included" /> : v}</td>; })}</tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
