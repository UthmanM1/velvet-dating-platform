import { cn } from "@/lib/utils";

/** Original VELVET mark: a draped "V" held inside a ring. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-8 w-8", className)} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="vg" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e6cfa3" />
          <stop offset="1" stopColor="#b34a67" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18.2" stroke="url(#vg)" strokeWidth="1.4" />
      <path d="M10.5 11.5c3.2 0 4.6 1.6 5.6 5.2l3.9 11.8 3.9-11.8c1-3.6 2.4-5.2 5.6-5.2" stroke="url(#vg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.8 24.5c1.8 2.4 3.6 3.4 5.2 3.4s3.4-1 5.2-3.4" stroke="#e6cfa3" strokeOpacity=".55" strokeWidth="1" strokeLinecap="round" />
      <circle cx="20" cy="33.2" r="1.2" fill="#e6cfa3" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark />
      <span className="font-display text-[1.65rem] leading-none tracking-[0.32em] text-ivory">
        VELVET
        {!compact && <span className="sr-only"> — Connections Without Boundaries</span>}
      </span>
    </span>
  );
}
