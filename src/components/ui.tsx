import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, children, center }: { eyebrow?: string; title: string; children?: ReactNode; center?: boolean }) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-4xl leading-[1.1] sm:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-base leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const tones = {
    info: "border-gold/30 bg-gold/5 text-champagne",
    error: "border-rose/40 bg-rose/10 text-[#f3c0cc]",
    success: "border-emerald-400/30 bg-emerald-400/5 text-emerald-200",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", tones[tone])}>
      {children}
    </div>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span title="Verified profile" className={cn("inline-flex items-center text-champagne", className)}>
      <BadgeCheck className="h-4 w-4" aria-hidden />
      <span className="sr-only">Verified profile</span>
    </span>
  );
}

export function OnlineDot({ online }: { online: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", online ? "text-emerald-300" : "text-muted")}>
      <span className={cn("h-2 w-2 rounded-full", online ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.8)]" : "bg-[#5b5055]")} aria-hidden />
      {online ? "Online" : "Offline"}
    </span>
  );
}

export function Field({ label, name, error, hint, children }: { label: string; name: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm text-ivory/90">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${name}-error`} className="mt-1 text-xs text-[#f3a3b5]">{error}</p>}
    </div>
  );
}

export function LinkButton({ href, children, variant = "primary", className }: { href: string; children: ReactNode; variant?: "primary" | "ghost" | "gold"; className?: string }) {
  return (
    <Link href={href} className={cn("btn", variant === "primary" ? "btn-primary" : variant === "gold" ? "btn-gold" : "btn-ghost", className)}>
      {children}
    </Link>
  );
}

export function StatTile({ label, value, hint, href }: { label: string; value: ReactNode; hint?: string; href?: string }) {
  const body = (
    <div className="card h-full p-5 transition hover:border-gold/40">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 font-display text-4xl text-champagne">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

export function Table({ children }: { children: ReactNode }) {
  return <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">{children}</table></div>;
}
export const th = "px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted border-b border-line";
export const td = "px-4 py-3 border-b border-line/60 align-middle";
