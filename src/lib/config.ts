/**
 * Central, server-side configuration. Nothing here is exposed to the browser:
 * only values prefixed NEXT_PUBLIC_ are ever inlined into client bundles, and this
 * module is imported from server code only.
 */

const env = process.env;

function siteUrl(): string {
  if (env.NEXT_PUBLIC_SITE_URL) return env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export const config = {
  appName: "VELVET",
  tagline: "Connections Without Boundaries.",
  siteUrl: siteUrl(),
  isProd: env.NODE_ENV === "production",

  /** Secret used to sign session cookies. Required in production. */
  sessionSecret: env.SESSION_SECRET ?? "",

  supabase: {
    url: env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    get configured() {
      return Boolean(this.url && this.anonKey && this.serviceRoleKey);
    },
  },

  stripe: {
    secretKey: env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? "",
    priceGold: env.STRIPE_PRICE_GOLD ?? "",
    pricePlatinum: env.STRIPE_PRICE_PLATINUM ?? "",
    /** Test mode only: live keys are deliberately rejected. */
    get configured() {
      return /^(sk|rk)_test_/.test(this.secretKey) && Boolean(this.priceGold && this.pricePlatinum);
    },
  },

  demo: {
    memberEmail: "demo@velvet.example",
    memberPassword: env.DEMO_MEMBER_PASSWORD ?? "VelvetDemo!2026",
    adminEmail: "admin@velvet.example",
    /** The admin demo account only exists when a password is explicitly configured. */
    adminPassword: env.DEMO_ADMIN_PASSWORD ?? "",
  },

  ageVerificationProvider: env.AGE_VERIFICATION_PROVIDER ?? "",
} as const;

/** The data layer currently runs on the in-memory demo adapter. See README. */
export const dataMode: "demo" = "demo";

export function requireSessionSecret(): string {
  if (config.sessionSecret.length >= 32) return config.sessionSecret;
  if (!config.isProd) return "dev-only-insecure-session-secret-change-me-0000";
  throw new Error("SESSION_SECRET must be set (32+ characters) in production.");
}
