import type { Metadata } from "next";
import { Legal } from "@/components/legal";
export const metadata: Metadata = { title: "Terms & conditions" };
export default function Page() {
  return (
    <Legal title="Terms & conditions" updated="9 November 2026">
      <h2>1. Eligibility</h2><p>You must be at least 18 years old to create an account or use VELVET. By registering you confirm that you are 18 or over and that the information you provide is accurate. We may require additional age verification at any time and may suspend accounts that do not pass it.</p>
      <h2>2. Your account</h2><p>You are responsible for keeping your credentials secure and for activity on your account. Provide a genuine profile and do not impersonate others or operate more than one account.</p>
      <h2>3. Acceptable use</h2><p>You must follow our Community Guidelines. You must not harass other members, post unlawful or explicit content, solicit money, or use VELVET for commercial promotion without our consent.</p>
      <h2>4. Memberships and billing</h2><p>Silver is free. Gold and Platinum are paid, recurring memberships billed in advance. You can cancel at any time and retain benefits until the end of the paid period. Prices and refund terms will be shown at checkout before purchase.</p>
      <h2>5. Content and moderation</h2><p>You retain ownership of your content but grant us a licence to host and display it to provide the service. We may review, remove or restrict content and may suspend or ban accounts that breach these terms.</p>
      <h2>6. Safety</h2><p>VELVET does not conduct criminal-record checks and cannot guarantee the conduct of members. Please take sensible precautions when meeting people.</p>
      <h2>7. Termination</h2><p>You may delete your account at any time from your dashboard. We may suspend or terminate accounts for breach of these terms.</p>
      <h2>8. Liability</h2><p>Nothing in these terms limits liability that cannot be limited by law. Subject to that, the service is provided &quot;as is&quot; and we are not liable for indirect losses.</p>
      <h2>9. Changes and contact</h2><p>We may update these terms and will notify members of material changes. Contact us via the Contact page.</p>
    </Legal>
  );
}
