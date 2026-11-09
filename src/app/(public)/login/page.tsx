import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/forms";
import { config } from "@/lib/config";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const u = await getCurrentUser();
  if (u) redirect(u.role === "admin" ? "/admin" : "/dashboard");
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue.">
      <LoginForm />
      <p className="mt-6 text-center text-sm text-muted">New to VELVET? <Link href="/register" className="text-champagne hover:underline">Create an account</Link></p>
      <div className="mt-8 rounded-xl border border-gold/25 bg-gold/5 p-4 text-sm">
        <p className="eyebrow mb-2">Demo access</p>
        <p className="text-muted">Explore a pre-populated Gold member (fictional data):</p>
        <p className="mt-2 font-mono text-xs text-champagne">{config.demo.memberEmail}<br />{config.demo.memberPassword}</p>
        <p className="mt-2 text-xs text-muted">Shared demo account: changes may be visible to other visitors and reset at any time. Register your own account for a private sandbox.</p>
      </div>
    </AuthShell>
  );
}
