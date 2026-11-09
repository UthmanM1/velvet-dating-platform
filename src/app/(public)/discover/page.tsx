import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";
import { MemberCard } from "@/components/member-card";
import { Alert, LinkButton, SectionHeading } from "@/components/ui";
import { CITY_NAMES, GENDER_LABEL, GENDERS, INTENTION_LABEL, INTENTIONS, INTERESTS } from "@/lib/reference";
import { discoverQuerySchema } from "@/lib/validation";
import { discover, teaserMembers } from "@/server/services/members";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Discover members" };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) {
    const teasers = await teaserMembers(8);
    return (
      <div className="container-x py-16">
        <SectionHeading eyebrow="Discover" title="A glimpse of who's on VELVET.">Create a free account to search by age, location, intention and interests, and to view full profiles.</SectionHeading>
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {teasers.map((m) => (
            <Link key={m.id} href="/register" className="group card overflow-hidden">
              <div className="relative aspect-[3/4]">
                <Image src={m.primaryPhoto} alt="" fill unoptimized className="object-cover blur-[2px] transition group-hover:blur-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/95 to-ink/10" />
                <div className="absolute inset-x-3 bottom-3"><p className="text-2xl">{m.displayName}, {m.age}</p><p className="text-xs text-ivory/70">{m.city}</p></div>
              </div>
            </Link>
          ))}
        </div>
        <div className="card mt-10 flex flex-col items-center gap-4 p-10 text-center">
          <Lock className="h-6 w-6 text-gold" aria-hidden />
          <h2 className="text-3xl">Join to see more</h2>
          <p className="max-w-md text-sm text-muted">Full profiles, search filters and messaging are available to registered, verified-email members aged 18 and over.</p>
          <div className="flex gap-3"><LinkButton href="/register">Join VELVET</LinkButton><LinkButton href="/login" variant="ghost">Sign in</LinkButton></div>
          <p className="text-xs text-muted">Demo members are fictional. Try the demo account from the sign-in page.</p>
        </div>
      </div>
    );
  }

  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]).filter(([, v]) => v !== "" && v !== undefined));
  for (const k of ["online", "verified", "recent"]) if (flat[k] === "on") flat[k] = "true";
  const parsed = discoverQuerySchema.safeParse(flat);
  const q = parsed.success ? parsed.data : discoverQuerySchema.parse({});
  const res = await discover(user, q);

  const sel = (name: string, val?: string | number) => ({ name, defaultValue: val ?? "", className: "input" });
  const qs = (page: number) => {
    const p = new URLSearchParams(Object.entries(flat).filter(([k]) => k !== "page").map(([k, v]) => [k, String(v)]));
    p.set("page", String(page));
    return `?${p.toString()}`;
  };

  return (
    <div className="container-x py-12">
      <SectionHeading eyebrow="Discover" title="Find your kind of company." />
      <div className="mt-10 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <form className="card h-fit space-y-4 p-5" method="get" aria-label="Search filters">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted">Min age<input type="number" min={18} max={99} {...sel("ageMin", q.ageMin)} /></label>
            <label className="text-xs text-muted">Max age<input type="number" min={18} max={99} {...sel("ageMax", q.ageMax)} /></label>
          </div>
          <label className="block text-xs text-muted">Gender<select {...sel("gender", q.gender)}><option value="">Any</option>{GENDERS.map((g) => <option key={g} value={g}>{GENDER_LABEL[g]}</option>)}</select></label>
          <label className="block text-xs text-muted">Looking for<select {...sel("intention", q.intention)}><option value="">Any</option>{INTENTIONS.map((i) => <option key={i} value={i}>{INTENTION_LABEL[i]}</option>)}</select></label>
          <label className="block text-xs text-muted">Location<select {...sel("city", q.city)}><option value="">Anywhere</option>{CITY_NAMES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <fieldset className="space-y-3 rounded-xl border border-line p-3">
            <legend className="px-1 text-xs text-gold">Advanced {res.tier === "silver" && "· Gold+"}</legend>
            <label className="block text-xs text-muted">Within<select {...sel("distance", q.distance)} disabled={res.tier === "silver"}><option value="">Any distance</option>{[25, 50, 100, 250].map((d) => <option key={d} value={d}>{d} km</option>)}</select></label>
            <label className="block text-xs text-muted">Interest<select {...sel("interest", q.interest)} disabled={res.tier === "silver"}><option value="">Any</option>{INTERESTS.map((i) => <option key={i}>{i}</option>)}</select></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="recent" defaultChecked={q.recent} disabled={res.tier === "silver"} className="accent-[#b34a67]" />Recently active</label>
          </fieldset>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="online" defaultChecked={q.online} className="accent-[#b34a67]" />Online now</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="verified" defaultChecked={q.verified} className="accent-[#b34a67]" />Verified only</label>
          <label className="block text-xs text-muted">Sort by<select {...sel("sort", q.sort)}><option value="relevance">Best match</option><option value="active">Recently active</option><option value="newest">Newest</option><option value="distance">Nearest</option><option value="age">Age</option></select></label>
          <div className="flex gap-2"><button className="btn btn-primary flex-1">Search</button><Link href="/discover" className="btn btn-ghost">Reset</Link></div>
          {res.tier === "silver" && <p className="text-xs text-muted"><Link href="/plans" className="text-champagne underline">Upgrade to Gold</Link> for distance, interest and activity filters.</p>}
        </form>

        <div>
          {res.lockedFilters && <div className="mb-5"><Alert>Distance, interest and activity filters need a Gold or Platinum membership, so they were not applied. <Link href="/plans" className="underline">View plans</Link></Alert></div>}
          <p className="mb-4 text-sm text-muted">{res.total} member{res.total === 1 ? "" : "s"} · page {res.page} of {res.totalPages}</p>
          {res.members.length === 0 ? (
            <div className="card p-10 text-center text-muted">No members match those filters. Try widening your search.</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">{res.members.map((m) => <MemberCard key={m.id} m={m} />)}</div>
          )}
          {res.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
              {res.page > 1 && <Link href={qs(res.page - 1)} className="btn btn-ghost btn-sm">Previous</Link>}
              <span className="px-3 text-sm text-muted">{res.page} / {res.totalPages}</span>
              {res.page < res.totalPages && <Link href={qs(res.page + 1)} className="btn btn-ghost btn-sm">Next</Link>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
