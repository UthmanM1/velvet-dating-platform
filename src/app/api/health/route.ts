import { config, dataMode } from "@/lib/config";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ status: "ok", dataMode, supabaseConfigured: config.supabase.configured, stripeConfigured: config.stripe.configured });
}
