import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/forms";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Join VELVET" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell title="Join VELVET" subtitle="Members must be 18 or over. Your email and date of birth are never shown publicly." wide>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted">Already a member? <Link href="/login" className="text-champagne hover:underline">Sign in</Link></p>
    </AuthShell>
  );
}
