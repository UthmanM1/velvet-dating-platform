import type { Metadata } from "next";
import { Legal } from "@/components/legal";
export const metadata: Metadata = { title: "Privacy policy" };
export default function Page() {
  return (
    <Legal title="Privacy policy" updated="9 November 2026">
      <h2>1. What we collect</h2><p>Account data (email, hashed password), profile data (display name, date of birth, gender, general location, bio, interests, photos), messages, subscription and payment records, and limited technical data needed to secure the service.</p>
      <h2>2. What other members see</h2><p>Display name, age, city, photos approved by moderators, biography, interests, preferences, online status (if you allow it) and verification status. Never your email address, date of birth or precise location.</p>
      <h2>3. Special category data</h2><p>Information about sexual orientation or relationship preferences may be inferred from what you share. We process it only with your explicit consent, to provide the service you request.</p>
      <h2>4. How we use data</h2><p>To operate your account, show you relevant members, deliver messages, process payments, keep the platform safe and meet legal obligations. Marketing and analytics are optional and controlled under Dashboard → Privacy.</p>
      <h2>5. Sharing</h2><p>We share data only with service providers acting on our behalf (hosting, email, payments) and where required by law. We do not sell personal data.</p>
      <h2>6. Retention and your rights</h2><p>You can edit your profile, export your data and delete your account at any time from your dashboard. Deleting your account removes your profile, photos, messages and favourites. You may also exercise rights of access, rectification, restriction, objection and complaint to the Information Commissioner&apos;s Office.</p>
      <h2>7. Security</h2><p>Passwords are hashed with scrypt, photos are stored privately, access is role-controlled and logs avoid personal data.</p>
      <h2>8. Contact</h2><p>Use the Contact page for privacy requests.</p>
    </Legal>
  );
}
