import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { OnlineDot, VerifiedBadge } from "@/components/ui";
import { INTENTION_LABEL } from "@/lib/reference";
import type { PublicProfile } from "@/lib/types";
import { favouriteAction } from "@/app/actions/member";
import { Heart } from "lucide-react";

export function MemberCard({ m, showFavourite = true }: { m: PublicProfile; showFavourite?: boolean }) {
  return (
    <article className="group card relative overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-gold/40">
      <Link href={`/discover/${m.id}`} className="block" aria-label={`View ${m.displayName}'s profile`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-charcoal">
          <Image src={m.primaryPhoto} alt="" fill unoptimized sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            {m.tier === "platinum" && <span className="chip border-gold/40 bg-ink/60 text-champagne backdrop-blur">Platinum</span>}
          </div>
          <div className="absolute inset-x-3 bottom-3">
            <h3 className="flex items-center gap-1.5 text-2xl leading-none">{m.displayName}, {m.age}{m.verified && <VerifiedBadge />}</h3>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-ivory/80"><MapPin className="h-3 w-3" aria-hidden />{m.city}{m.distanceKm !== null && ` · ${m.distanceKm} km`}</p>
          </div>
        </div>
        <div className="space-y-2 p-4">
          <OnlineDot online={m.online} />
          <p className="text-xs text-muted">{INTENTION_LABEL[m.intention]}</p>
        </div>
      </Link>
      {showFavourite && (
        <form action={favouriteAction} className="absolute right-3 top-3">
          <input type="hidden" name="targetId" value={m.id} />
          <button className="grid h-9 w-9 place-items-center rounded-full border border-line bg-ink/60 backdrop-blur transition hover:border-gold" aria-label={m.isFavourite ? `Remove ${m.displayName} from favourites` : `Add ${m.displayName} to favourites`} aria-pressed={m.isFavourite}>
            <Heart className={`h-4 w-4 ${m.isFavourite ? "fill-rose text-rose" : "text-ivory"}`} aria-hidden />
          </button>
        </form>
      )}
    </article>
  );
}
