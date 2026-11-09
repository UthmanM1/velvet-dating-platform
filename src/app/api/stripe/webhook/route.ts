import { NextResponse } from "next/server";
import { applyStripeEvent, verifyStripeWebhook } from "@/server/services/billing";

/** Stripe sends signed events here. Unsigned or badly signed requests are rejected. */
export async function POST(req: Request) {
  const raw = await req.text();
  const event = verifyStripeWebhook(raw, req.headers.get("stripe-signature"));
  if (!event) return NextResponse.json({ error: "Invalid signature or Stripe not configured" }, { status: 400 });
  await applyStripeEvent(event as unknown as { type: string; data: { object: Record<string, unknown> } });
  return NextResponse.json({ received: true });
}
