import type { Metadata } from "next";
import { DeleteAccountForm, PasswordForm } from "@/components/forms";
import { formatDate } from "@/lib/utils";
import { requireUser } from "@/server/session";
export const metadata: Metadata = { title: "Account" };
export default async function Page() {
  const user = await requireUser();
  return (
    <div className="space-y-8">
      <h1 className="text-4xl">Account settings</h1>
      <section className="card p-6"><h2 className="text-2xl">Sign-in details</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3"><div><dt className="eyebrow">Email</dt><dd className="mt-1">{user.email}</dd><dd className="text-xs text-muted">Visible only to you.</dd></div><div><dt className="eyebrow">Member since</dt><dd className="mt-1">{formatDate(user.createdAt)}</dd></div><div><dt className="eyebrow">Age check</dt><dd className="mt-1">{user.ageVerification.status === "provider_verified" ? "Verified by provider" : "Self-declared"}</dd></div></dl>
      </section>
      <section className="card max-w-xl p-6"><h2 className="mb-4 text-2xl">Change password</h2><PasswordForm /></section>
      <section className="card p-6"><h2 className="text-2xl">Your data</h2><p className="mt-2 text-sm text-muted">Download everything we hold about you as a JSON file.</p><a href="/api/account/export" className="btn btn-ghost mt-4" download>Download my data</a></section>
      <section className="card max-w-xl border-rose/30 p-6"><h2 className="mb-4 text-2xl">Delete account</h2><DeleteAccountForm /></section>
    </div>
  );
}
