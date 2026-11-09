import { NextResponse } from "next/server";
import { consume } from "@/lib/rate-limit";
import { messageSchema } from "@/lib/validation";
import { getFullThreadForRoute, send } from "./helpers";
import { assertSameOrigin, getCurrentUser } from "@/server/session";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const c = new URL(req.url).searchParams.get("c") ?? "";
  const thread = await getFullThreadForRoute(user, c);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(thread, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertSameOrigin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!consume(`msg:${user.id}`, 30, 60_000).allowed) return NextResponse.json({ error: "You're sending messages too quickly." }, { status: 429 });
  const parsed = messageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const res = await send(user, parsed.data.to, parsed.data.body);
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: 403 });
  return NextResponse.json({ conversationId: res.conversationId });
}
