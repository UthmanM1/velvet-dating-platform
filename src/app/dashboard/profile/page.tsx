import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { removePhotoAction, primaryPhotoAction } from "@/app/actions/member";
import { PhotoUploadForm, ProfileForm, SubmitButton } from "@/components/forms";
import { VerifiedBadge } from "@/components/ui";
import { ageFromDob } from "@/lib/utils";
import { getOwnProfile } from "@/server/services/members";
import { requireUser } from "@/server/session";
export const metadata: Metadata = { title: "My profile" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();
  const p = await getOwnProfile(user.id);
  const status = { approved: "Visible", pending: "Awaiting review", rejected: "Not approved" } as const;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="flex items-center gap-2 text-4xl">My profile {p.verified && <VerifiedBadge />}</h1><Link href={`/discover/${user.id}`} className="hidden" aria-hidden>Preview</Link><p className="text-sm text-muted">{p.displayName}, {ageFromDob(p.dob)} · {p.city}</p></div>
      <section className="card p-6">
        <h2 className="text-2xl">Photos</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Your primary photo appears on your discovery card. Up to 6 photos.</p>
        {p.photos.length === 0 ? <p className="mb-5 text-sm text-muted">No photos yet. Profiles with photos are far more visible.</p> : (
          <ul className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">{p.photos.map((ph) => (
            <li key={ph.id} className="space-y-2">
              <div className="card relative aspect-[3/4] overflow-hidden"><Image src={ph.url} alt="Your photo" fill unoptimized className="object-cover" />{ph.isPrimary && <span className="chip absolute left-2 top-2 bg-ink/70 text-champagne">Primary</span>}<span className="chip absolute bottom-2 left-2 bg-ink/70">{status[ph.status]}</span></div>
              <div className="flex gap-2">
                {!ph.isPrimary && ph.status !== "rejected" && <form action={primaryPhotoAction}><input type="hidden" name="photoId" value={ph.id} /><SubmitButton className="btn btn-ghost btn-sm">Make primary</SubmitButton></form>}
                <form action={removePhotoAction}><input type="hidden" name="photoId" value={ph.id} /><SubmitButton className="btn btn-danger btn-sm">Remove</SubmitButton></form>
              </div>
            </li>))}</ul>)}
        <PhotoUploadForm />
      </section>
      <section className="card p-6"><h2 className="mb-5 text-2xl">Details</h2><ProfileForm profile={p} /></section>
    </div>
  );
}
