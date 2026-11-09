import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "@/components/logo";
import { logoutAction } from "@/app/actions/public";
import { getCurrentUser } from "@/server/session";

const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/plans", label: "Membership" },
  { href: "/safety", label: "Safety & privacy" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur-md">
      <div className="container-x flex h-[4.5rem] items-center justify-between">
        <Link href="/" aria-label="VELVET home"><Logo /></Link>
        <nav aria-label="Main" className="hidden items-center gap-8 text-sm text-muted lg:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="transition hover:text-champagne">{n.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <Link href={user.role === "admin" ? "/admin" : "/dashboard"} className="btn btn-ghost btn-sm">{user.role === "admin" ? "Admin" : "Dashboard"}</Link>
              <form action={logoutAction}><button className="btn btn-sm text-muted hover:text-ivory">Sign out</button></form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-sm text-muted hover:text-ivory">Sign in</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Join VELVET</Link>
            </>
          )}
        </div>
        <details className="relative lg:hidden">
          <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full border border-line" aria-label="Menu"><Menu className="h-5 w-5" /></summary>
          <div className="card absolute right-0 top-12 w-64 space-y-1 p-3 shadow-2xl">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-raised">{n.label}</Link>)}
            <div className="rule my-2" />
            {user ? (
              <>
                <Link href={user.role === "admin" ? "/admin" : "/dashboard"} className="block rounded-lg px-3 py-2 text-sm hover:bg-raised">{user.role === "admin" ? "Admin" : "Dashboard"}</Link>
                <form action={logoutAction}><button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-raised">Sign out</button></form>
              </>
            ) : (
              <>
                <Link href="/login" className="block rounded-lg px-3 py-2 text-sm hover:bg-raised">Sign in</Link>
                <Link href="/register" className="btn btn-primary mt-2 w-full">Join VELVET</Link>
              </>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const cols = [
    { title: "VELVET", links: [["About", "/about"], ["Discover", "/discover"], ["Membership", "/plans"], ["Contact", "/contact"]] },
    { title: "Trust", links: [["Safety & privacy", "/safety"], ["Community guidelines", "/guidelines"], ["FAQ", "/faq"]] },
    { title: "Legal", links: [["Terms & conditions", "/terms"], ["Privacy policy", "/privacy"]] },
  ];
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">Connections Without Boundaries. A discreet, premium dating platform for verified adults aged 18 and over.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="eyebrow mb-4">{c.title}</p>
            <ul className="space-y-2.5 text-sm text-muted">{c.links.map(([l, h]) => <li key={h}><Link href={h} className="hover:text-champagne">{l}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line/60 py-6 text-center text-xs text-muted">
        <div className="container-x">© {new Date().getFullYear()} VELVET. 18+ only. This is a demonstration build: all profiles are fictional.</div>
      </div>
    </footer>
  );
}
