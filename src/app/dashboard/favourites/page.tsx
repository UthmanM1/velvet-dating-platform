import type { Metadata } from "next";
import Link from "next/link";
import { MemberCard } from "@/components/member-card";
import { listFavourites } from "@/server/services/members";
import { requireUser } from "@/server/session";
export const metadata: Metadata = { title: "Favourites" };
export default async function Page() {
  const user = await requireUser();
  const favs = await listFavourites(user);
  return (
    <div><h1 className="text-4xl">Favourites</h1>
      {favs.length === 0 ? <div className="card mt-6 p-10 text-center text-muted">You haven&apos;t saved anyone yet. <Link href="/discover" className="text-champagne underline">Discover members</Link></div> : <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">{favs.map((m) => <MemberCard key={m.id} m={m} />)}</div>}
    </div>
  );
}
