import type { Metadata } from "next";
import { Eye, Flag, Lock, ShieldCheck, UserX, FileDown } from "lucide-react";
import { SectionHeading } from "@/components/ui";
export const metadata: Metadata = { title: "Safety & privacy" };
export default function Page() {
  const items = [
    [ShieldCheck, "Adults only", "Members must be 18+. Registration requires an age declaration and the platform is structured for a third-party age-verification provider."],
    [Lock, "Private by default", "Photos are stored privately and served only to signed-in members who are permitted to view them. Emails and exact locations are never shown."],
    [Eye, "You control visibility", "Show to everyone, to verified members only, or hide your profile entirely. Hide online status and distance at any time."],
    [Flag, "Report in one tap", "Every profile and conversation has Report and Block. Our moderators review reports, photos and accounts."],
    [UserX, "Block and disappear", "Blocking removes you from each other's discovery and conversations instantly."],
    [FileDown, "Your data, your call", "Download a copy of your data or permanently delete your account from your dashboard whenever you like."],
  ] as const;
  return (
    <div className="container-x py-16">
      <SectionHeading eyebrow="Safety & privacy" title="Protection that stays out of the way.">Safety is built into every layer of VELVET, from how photos are stored to how accounts are moderated.</SectionHeading>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(([I, t, b]) => <div key={t} className="card p-6"><I className="h-6 w-6 text-gold" aria-hidden /><h3 className="mt-4 text-2xl">{t}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{b}</p></div>)}</div>
      <div className="mt-14 max-w-3xl">
        <h2 className="text-3xl">Staying safe when meeting</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted"><li>Keep conversation on VELVET until you feel comfortable.</li><li>Never send money or share financial details with someone you haven&apos;t met.</li><li>Meet in a public place and tell a friend where you&apos;ll be.</li><li>Trust your instincts. If something feels wrong, block and report.</li></ul>
      </div>
    </div>
  );
}
