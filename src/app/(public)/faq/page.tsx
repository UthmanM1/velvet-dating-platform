import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui";
export const metadata: Metadata = { title: "Frequently asked questions" };
const FAQ: [string, string][] = [
  ["Who can join VELVET?", "Only adults aged 18 or over. You confirm your age at registration, and the platform is built so that a third-party age-verification service can be integrated."],
  ["Is my email address visible to other members?", "Never. Other members see your display name, age, general location (city), photos and the profile details you choose to share."],
  ["How do I verify my profile?", "Verified badges are granted by our moderation team. In this demonstration build verification is toggled from the administrator console."],
  ["Can I hide my profile?", "Yes. Set visibility to 'Verified members only' or 'Hidden' under Dashboard → Privacy. Platinum members can also browse incognito."],
  ["What do the membership tiers include?", "Silver is free and includes basic discovery and a small messaging allowance. Gold adds advanced search and more messages. Platinum adds priority visibility, incognito browsing and exclusive features."],
  ["Can I cancel at any time?", "Yes. Cancel from Dashboard → Subscription. You keep your benefits until the end of the current billing period."],
  ["How are photos reviewed?", "New photos are held for review and become visible to other members once approved. Photos must not contain nudity."],
  ["How do I delete my account?", "Dashboard → Account lets you download your data and permanently delete your account and content."],
  ["Is payment real?", "No. This build uses a demo billing mode, or Stripe in test mode when test keys are configured. No live charges are made."],
];
export default function Page() {
  return (
    <div className="container-x max-w-3xl py-16">
      <SectionHeading eyebrow="FAQ" title="Questions, answered." />
      <div className="mt-10 space-y-3">{FAQ.map(([q, a]) => (
        <details key={q} className="card group p-5 open:border-gold/40"><summary className="cursor-pointer list-none font-display text-2xl marker:hidden">{q}</summary><p className="mt-3 text-sm leading-relaxed text-muted">{a}</p></details>))}
      </div>
    </div>
  );
}
