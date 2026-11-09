import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Alert } from "@/components/ui";
import { verifyEmailToken } from "@/server/services/auth";
export const metadata: Metadata = { title: "Verify email", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const res = token ? await verifyEmailToken(token) : { ok: false, message: "This verification link is missing its token." };
  return (
    <AuthShell title="Email verification">
      <Alert tone={res.ok ? "success" : "error"}>{res.message}</Alert>
      <div className="mt-6 text-center"><Link href={res.ok ? "/login" : "/register"} className="btn btn-primary">{res.ok ? "Sign in" : "Back to registration"}</Link></div>
    </AuthShell>
  );
}
