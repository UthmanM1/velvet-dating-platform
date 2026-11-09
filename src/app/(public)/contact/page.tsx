import type { Metadata } from "next";
import { ContactForm } from "@/components/forms";
import { SectionHeading } from "@/components/ui";
export const metadata: Metadata = { title: "Contact" };
export default function Page() {
  return (
    <div className="container-x grid gap-12 py-16 lg:grid-cols-2">
      <div>
        <SectionHeading eyebrow="Contact" title="We're here to help.">Questions about your account, billing or safety? Send us a note. To report a member, use the Report button on their profile so our moderators can act quickly.</SectionHeading>
        <div className="card mt-8 p-5 text-sm text-muted">Demo build: the contact form is validated and rate limited, but no support inbox is connected yet. See the README for wiring an email provider.</div>
      </div>
      <div className="card p-7"><ContactForm /></div>
    </div>
  );
}
