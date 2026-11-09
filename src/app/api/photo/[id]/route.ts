import { getStorage } from "@/server/adapters";
import { resolvePhoto } from "@/server/services/members";
import { getCurrentUser } from "@/server/session";

/** Private image delivery: signed-in members only, and only photos they are allowed to see. */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const found = await resolvePhoto(user, id);
  if (!found) return new Response("Not found", { status: 404 });
  const url = await getStorage().signedUrl(found.path, 60);
  const m = /^data:([^;]+);base64,(.*)$/.exec(url);
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" },
  });
}
