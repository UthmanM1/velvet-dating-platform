import Link from "next/link";
import type { Metadata } from "next";
import { Bell, CreditCard, Heart, LayoutDashboard, MessageCircle, Settings, ShieldCheck, UserRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { logoutAction } from "@/app/actions/public";
import { unreadCount } from "@/server/services/messaging";
import { getStore } from "@/server/store";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · VELVET" }, robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role === "admin") {
    // Admin demo account has no member profile experience.
  }
  const [unread, store] = await Promise.all([unreadCount(user), getStore()]);
  const notifs = store.notifications.filter((n) => n.userId === user.id && !n.read).length;
  const nav = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/messages", label: "Messages", icon: MessageCircle, badge: unread },
    { href: "/dashboard/favourites", label: "Favourites", icon: Heart },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell, badge: notifs },
    { href: "/dashboard/profile", label: "My profile", icon: UserRound },
    { href: "/dashboard/privacy", label: "Privacy", icon: ShieldCheck },
    { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
    { href: "/dashboard/settings", label: "Account", icon: Settings },
  ];
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-ink/85 backdrop-blur-md">
        <div className="container-x flex h-16 items-center justify-between">
          <Link href="/" aria-label="VELVET home"><Logo compact /></Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/discover" className="btn btn-primary btn-sm">Discover</Link>
            {user.role === "admin" && <Link href="/admin" className="btn btn-ghost btn-sm">Admin</Link>}
            <form action={logoutAction}><button className="btn btn-sm text-muted hover:text-ivory">Sign out</button></form>
          </div>
        </div>
      </header>
      <div className="container-x grid gap-8 py-8 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-muted transition hover:bg-surface hover:text-champagne">
              <n.icon className="h-4 w-4" aria-hidden />{n.label}
              {n.badge ? <span className="ml-auto rounded-full bg-burgundy px-2 py-0.5 text-[0.65rem] text-ivory" aria-label={`${n.badge} unread`}>{n.badge}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
