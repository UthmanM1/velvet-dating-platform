import type { Metadata } from "next";
import { LinkButton, SectionHeading } from "@/components/ui";
export const metadata: Metadata = { title: "About VELVET" };
export default function Page() {
  const values = [
    ["Discretion", "Your profile, your rules. Granular visibility, private photo delivery and no public contact details."],
    ["Respect", "Clear community guidelines, fast moderation and effortless blocking and reporting."],
    ["Authenticity", "Photo review, profile verification and a platform designed for real adults with real intent."],
  ];
  return (
    <div className="container-x py-16">
      <SectionHeading eyebrow="About" title="Intimate, premium and discreet by design.">VELVET exists for adults who want an elegant, grown-up way to meet people, without the noise, and without compromising privacy.</SectionHeading>
      <div className="mt-12 grid gap-5 md:grid-cols-3">{values.map(([t, b]) => <div key={t} className="card p-7"><h3 className="text-3xl text-champagne">{t}</h3><p className="mt-3 text-sm leading-relaxed text-muted">{b}</p></div>)}</div>
      <div className="mt-16 max-w-3xl space-y-5 text-lg leading-relaxed text-ivory/85">
        <p>Our name is a promise: soft on the surface, substantial underneath. We combine the usability of a mainstream dating service with a more discreet, adult sensibility, and we build every feature around consent, safety and control.</p>
        <p>VELVET is for verified adults aged 18 and over. We take that seriously, and the platform is structured to integrate third-party age verification so that a simple tick-box is never the only safeguard.</p>
      </div>
      <div className="mt-10 flex gap-3"><LinkButton href="/register">Join VELVET</LinkButton><LinkButton href="/safety" variant="ghost">Safety & privacy</LinkButton></div>
    </div>
  );
}
