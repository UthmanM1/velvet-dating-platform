import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Ban, Heart, MapPin } from "lucide-react";
import { blockAction, favouriteAction } from "@/app/actions/member";
import { InterestButton, NewMessageForm, ReportForm, SubmitButton } from "@/components/forms";
import { OnlineDot, VerifiedBadge } from "@/components/ui";
import { INTENTION_LABEL } from "@/lib/reference";
import { getMember } from "@/server/services/members";
import { getStore, conversationId } from "@/server/store";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Member profile", robots: { index: false } };

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (id === user.id) redirect("/dashboard/profile");
  const m = await getMember(user, id);
  if (!m) notFound();
  const store = await getStore();
  const cid = conversationId(user.id, id);
  const hasConversation = store.conversations.has(cid);
  const sentInterest = store.interests.some((i) => i.fromId === user.id && i.toId === id);
  const L = m.lifestyle;
  const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="container-x py-12">
      <Link href="/discover" className="text-sm text-muted hover:text-champagne">← Back to discovery</Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <div className="space-y-3">
          <div className="card relative aspect-[3/4] overflow-hidden"><Image src={m.primaryPhoto} alt={`${m.displayName}'s profile photo`} fill unoptimized priority className="object-cover" /></div>
          {m.photos.length > 1 && <div className="grid grid-cols-3 gap-3">{m.photos.slice(0, 6).map((p) => <div key={p.id} className="card relative aspect-square overflow-hidden"><Image src={p.url} alt="" fill unoptimized className="object-cover" /></div>)}</div>}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-5xl">{m.displayName}, {m.age}</h1>
            {m.verified && <VerifiedBadge className="[&_svg]:h-6 [&_svg]:w-6" />}
            {m.tier === "platinum" && <span className="chip border-gold/40 text-champagne">Platinum</span>}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted"><span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden />{m.city}{m.distanceKm !== null && ` · about ${m.distanceKm} km away`}</span><OnlineDot online={m.online} /><span>{m.lastActiveLabel}</span></p>
          <p className="mt-6 text-lg leading-relaxed text-ivory/90">{m.bio}</p>
          <dl className="mt-8 grid gap-6 sm:grid-cols-2">
            <div><dt className="eyebrow">Looking for</dt><dd className="mt-1">{INTENTION_LABEL[m.intention]}</dd></div>
            <div><dt className="eyebrow">Relationship preferences</dt><dd className="mt-1 text-sm text-muted">{m.relationshipPreferences || "Not shared"}</dd></div>
            <div><dt className="eyebrow">Lifestyle</dt><dd className="mt-1 text-sm text-muted">Smoking: {cap(L.smoking)} · Drinking: {cap(L.drinking)} · Children: {cap(L.children)} · Exercise: {cap(L.fitness)}</dd></div>
            <div><dt className="eyebrow">Interests</dt><dd className="mt-2 flex flex-wrap gap-2">{m.interests.length ? m.interests.map((i) => <span key={i} className="chip">{i}</span>) : <span className="text-sm text-muted">Not shared</span>}</dd></div>
          </dl>

          <div className="rule my-8" />
          <div className="flex flex-wrap items-start gap-3">
            <form action={favouriteAction}><input type="hidden" name="targetId" value={m.id} /><SubmitButton className="btn btn-ghost"><Heart className={`h-4 w-4 ${m.isFavourite ? "fill-rose text-rose" : ""}`} aria-hidden />{m.isFavourite ? "Favourited" : "Add to favourites"}</SubmitButton></form>
            <InterestButton targetId={m.id} sent={sentInterest} />
            <form action={blockAction}><input type="hidden" name="targetId" value={m.id} /><SubmitButton className="btn btn-ghost btn-sm"><Ban className="h-4 w-4" aria-hidden />Block</SubmitButton></form>
            <ReportForm targetId={m.id} />
          </div>

          <div className="card mt-8 p-6">
            <h2 className="mb-4 text-2xl">{hasConversation ? "Continue your conversation" : `Message ${m.displayName}`}</h2>
            {hasConversation ? <Link href={`/dashboard/messages/${cid}`} className="btn btn-primary">Open conversation</Link> : <NewMessageForm targetId={m.id} name={m.displayName} />}
          </div>
        </div>
      </div>
    </div>
  );
}
