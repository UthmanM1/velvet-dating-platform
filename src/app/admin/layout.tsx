import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { logoutAction } from "@/app/actions/public";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · VELVET Admin" }, robots: { index: false, follow: false } };

const NAV = [["/admin", "Overview"], ["/admin/members", "Members"], ["/admin/reports", "Reports"], ["/admin/photos", "Photos"], ["/admin/subscriptions", "Subscriptions"], ["/admin/audit", "Audit log"]];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // role-based access control: non-admins are redirected before anything renders
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line/70 bg-ink/85">
        <div className="container-x flex h-16 items-center justify-between"><Link href="/admin" className="flex items-center gap-3"><Logo compact /><span className="chip border-gold/40 text-champagne">Admin</span></Link>
          <form action={logoutAction}><button className="btn btn-sm text-muted hover:text-ivory">Sign out</button></form></div>
      </header>
      <div className="container-x py-8">
        <nav aria-label="Admin" className="mb-8 flex gap-1 overflow-x-auto">{NAV.map(([h, l]) => <Link key={h} href={h} className="shrink-0 rounded-full px-4 py-2 text-sm text-muted transition hover:bg-surface hover:text-champagne">{l}</Link>)}</nav>
        {children}
      </div>
    </div>
  );
}
