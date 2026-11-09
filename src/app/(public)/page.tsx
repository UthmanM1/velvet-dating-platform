import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, EyeOff, Lock, MessageCircle, SlidersHorizontal, Sparkles } from "lucide-react";
import { LinkButton, SectionHeading } from "@/components/ui";
import { formatPrice, getPlans } from "@/lib/plans";
import { teaserMembers } from "@/server/services/members";
import { getCurrentUser } from "@/server/session";
import { Check } from "lucide-react";

export default async function HomePage() {
  const [teasers, user] = await Promise.all([teaserMembers(4), getCurrentUser()]);
  const plans = getPlans();
  const features = [
    { icon: SlidersHorizontal, title: "Considered discovery", body: "Filter by age, distance, intention, interests and activity to find people who fit your life." },
    { icon: MessageCircle, title: "Private messaging", body: "Unhurried one-to-one conversations with read receipts and instant notifications." },
    { icon: BadgeCheck, title: "Verified profiles", body: "Look for the champagne badge. Verified members have passed an additional review." },
    { icon: EyeOff, title: "Discretion built in", body: "Hide your profile, limit visibility and control exactly what other members can see." },
    { icon: Lock, title: "Private by design", body: "Approved photos only, restricted image access, and no public email or exact location." },
    { icon: Sparkles, title: "Premium experience", body: "A calm, beautifully designed space with no noise, no clutter and no pressure." },
  ];
  return (
    <>
      <section className="hero-art relative overflow-hidden">
        <div className="container-x grid items-center gap-14 py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
          <div className="animate-fade-up">
            <p className="eyebrow mb-5">For verified adults · 18+</p>
            <h1 className="text-[3.2rem] leading-[1.02] sm:text-7xl">Connections <em className="text-champagne not-italic">Without Boundaries.</em></h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">VELVET is a discreet, premium place to meet considered, like-minded adults. Elegant by design, private by default, and built around genuine connection.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              {user ? <LinkButton href="/dashboard">Go to your dashboard <ArrowRight className="h-4 w-4" /></LinkButton> : <LinkButton href="/register">Join VELVET <ArrowRight className="h-4 w-4" /></LinkButton>}
              <LinkButton href="/discover" variant="ghost">Preview members</LinkButton>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted">
              <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-gold" />Profile verification</li>
              <li className="flex items-center gap-2"><Lock className="h-4 w-4 text-gold" />Private photo storage</li>
              <li className="flex items-center gap-2"><EyeOff className="h-4 w-4 text-gold" />Visibility controls</li>
            </ul>
          </div>
          <div className="relative mx-auto hidden h-[30rem] w-full max-w-md sm:block" aria-hidden="true">
            {[{ id: "demo_isabelle", c: "left-0 top-6 rotate-[-6deg]" }, { id: "demo_julian", c: "right-0 top-0 rotate-[5deg] z-10" }, { id: "demo_camille", c: "left-12 bottom-0 rotate-[-1deg] z-20" }].map((x, i) => (
              <div key={x.id} className={`absolute ${x.c} w-56 overflow-hidden rounded-2xl border border-gold/30 shadow-2xl shadow-black/60 animate-fade-up`} style={{ animationDelay: `${0.15 * (i + 1)}s` }}>
                <Image src={`/api/avatar/${x.id}`} alt="" width={300} height={400} unoptimized className="aspect-[3/4] w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-20">
        <SectionHeading eyebrow="Value" title="A quieter, more considered way to meet.">Most platforms optimise for noise. VELVET optimises for quality: fewer, better introductions with the privacy you expect.</SectionHeading>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-6 transition hover:border-gold/40">
              <f.icon className="h-6 w-6 text-gold" aria-hidden />
              <h3 className="mt-4 text-2xl">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Discover" title="Meet members near you." />
          <Link href="/discover" className="text-sm text-champagne hover:underline">See more members →</Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {teasers.map((m) => (
            <Link key={m.id} href="/register" className="group card overflow-hidden">
              <div className="relative aspect-[3/4]">
                <Image src={m.primaryPhoto} alt="" fill unoptimized className="object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 to-transparent" />
                <p className="absolute bottom-3 left-3 text-2xl">{m.displayName}, {m.age}<span className="block font-sans text-xs text-ivory/70">{m.city}</span></p>
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">Illustrated demonstration profiles. All members shown are fictional.</p>
      </section>

      <section className="container-x py-20">
        <SectionHeading eyebrow="Membership" title="Choose how you want to be seen." center>Start free. Upgrade when you want more reach, more messages and more privacy. Prices shown are placeholders and fully configurable.</SectionHeading>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.tier} className={`card flex flex-col p-7 ${p.tier === "gold" ? "border-gold/50 shadow-[0_0_60px_-20px_rgba(201,167,102,.45)]" : ""}`}>
              <p className="eyebrow">{p.name}</p>
              <p className="mt-3 font-display text-5xl text-champagne">{formatPrice(p.pricePence)}<span className="ml-1 font-sans text-sm text-muted">{p.pricePence > 0 && "/ month"}</span></p>
              <p className="mt-2 text-sm text-muted">{p.blurb}</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />{f}</li>)}</ul>
              <LinkButton href="/plans" variant={p.tier === "gold" ? "gold" : "ghost"} className="mt-7">Compare plans</LinkButton>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x pb-8">
        <div className="card hero-art px-6 py-16 text-center sm:px-16">
          <h2 className="text-4xl sm:text-6xl">Begin discreetly.</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">Create your profile in minutes. You decide who sees it, and when.</p>
          <div className="mt-8 flex justify-center gap-3"><LinkButton href="/register">Create your profile</LinkButton><LinkButton href="/safety" variant="ghost">How we protect you</LinkButton></div>
        </div>
      </section>
    </>
  );
}
