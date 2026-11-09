import type { Metadata } from "next";
import { Legal } from "@/components/legal";
export const metadata: Metadata = { title: "Community guidelines" };
export default function Page() {
  return (
    <Legal title="Community guidelines" updated="9 November 2026">
      <h2>Be who you say you are</h2><p>Use your own photos and honest details. Impersonation, catfishing and fake profiles are removed.</p>
      <h2>Respect consent and boundaries</h2><p>No means no. Stop contacting anyone who declines or blocks you. Harassment, threats and hate speech lead to immediate removal.</p>
      <h2>Keep it tasteful</h2><p>Photos must not contain nudity or sexually explicit imagery. Messages must not include unsolicited explicit content.</p>
      <h2>Adults only</h2><p>Anyone who appears to be under 18 is removed and reported where required by law. Never ask for or share images of minors.</p>
      <h2>No scams or solicitation</h2><p>Do not ask for money, promote services, or direct members to external sites or payment platforms.</p>
      <h2>Protect privacy</h2><p>Do not share another person&apos;s details or screenshots without consent.</p>
      <h2>Enforcement</h2><p>We may warn, restrict, suspend or ban accounts. Every decision by our team is recorded in an audit log.</p>
    </Legal>
  );
}
