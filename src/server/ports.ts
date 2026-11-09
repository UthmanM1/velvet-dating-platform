/**
 * Service ports (interfaces).
 *
 * The application talks to infrastructure only through these interfaces so that each concern can be
 * swapped independently. Suggested AWS targets are listed per port; see docs/AWS_MIGRATION.md.
 *
 * Currently implemented adapters:
 *   EmailPort            -> DemoEmailAdapter (in-memory outbox).            AWS target: SES
 *   StoragePort          -> DemoStorageAdapter (in-memory data URLs).       AWS target: S3 + signed URLs
 *   PaymentPort          -> DemoPaymentAdapter / StripePaymentAdapter       (Stripe test mode)
 *   AgeVerificationPort  -> SelfDeclaredAgeAdapter / ProviderStub           (third-party provider slot)
 *   Auth + data          -> the in-memory demo store behind src/server/services/*.
 *                           Supabase Auth/Postgres schema is provided in supabase/migrations;
 *                           AWS target: Cognito + RDS.
 */
import type { Tier } from "@/lib/types";

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  /** Action link (verification, reset). Only surfaced in the UI in demo mode. */
  link?: string;
}

export interface EmailPort {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

export interface StoredObject {
  /** Opaque storage path. Never a public URL. */
  path: string;
}

export interface StoragePort {
  readonly name: string;
  put(userId: string, file: { bytes: Uint8Array; contentType: string }): Promise<StoredObject>;
  /** Short-lived URL for rendering a private object. */
  signedUrl(path: string, ttlSeconds: number): Promise<string>;
  remove(path: string): Promise<void>;
}

export interface CheckoutRequest {
  userId: string;
  email: string;
  tier: Tier;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentPort {
  readonly name: "demo" | "stripe";
  readonly liveCharges: false;
  /** Returns a hosted checkout URL, or null when the adapter completes changes in-app (demo). */
  createCheckout(req: CheckoutRequest): Promise<{ url: string | null }>;
  changePlan(stripeSubscriptionId: string, tier: Tier): Promise<void>;
  cancelAtPeriodEnd(stripeSubscriptionId: string): Promise<void>;
  resume(stripeSubscriptionId: string): Promise<void>;
}

export interface AgeVerificationPort {
  readonly name: string;
  /** True when the adapter performs genuine third-party verification. */
  readonly isThirdParty: boolean;
  start(userId: string): Promise<{ status: "self_declared" | "pending" | "provider_verified"; redirectUrl?: string }>;
}

export class NotConfiguredError extends Error {
  constructor(what: string, needs: string[]) {
    super(`${what} is not configured. Required: ${needs.join(", ")}`);
    this.name = "NotConfiguredError";
  }
}
