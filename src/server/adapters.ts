import Stripe from "stripe";
import { config } from "@/lib/config";
import type { Tier } from "@/lib/types";
import { uid } from "@/lib/utils";
import {
  NotConfiguredError,
  type AgeVerificationPort,
  type CheckoutRequest,
  type EmailMessage,
  type EmailPort,
  type PaymentPort,
  type StoragePort,
} from "./ports";
import { getStore } from "./store";

/* ---------------- Email ---------------- */

class DemoEmailAdapter implements EmailPort {
  readonly name = "demo-outbox";
  async send(message: EmailMessage): Promise<void> {
    const store = await getStore();
    store.outbox.unshift({ id: uid("mail_"), at: new Date().toISOString(), ...message });
    store.outbox.length = Math.min(store.outbox.length, 200);
  }
}

/** Slot for SES / Resend / Postmark. Intentionally not implemented without credentials. */
class ProviderEmailStub implements EmailPort {
  readonly name = "provider-email-stub";
  async send(): Promise<void> {
    throw new NotConfiguredError("Transactional email provider", ["EMAIL_PROVIDER_API_KEY"]);
  }
}

export function getEmail(): EmailPort {
  return process.env.EMAIL_PROVIDER_API_KEY ? new ProviderEmailStub() : new DemoEmailAdapter();
}

/* ---------------- Storage ---------------- */

const objects = new Map<string, string>();

class DemoStorageAdapter implements StoragePort {
  readonly name = "demo-memory";
  async put(userId: string, file: { bytes: Uint8Array; contentType: string }) {
    const path = `${userId}/${uid("img_")}`;
    objects.set(path, `data:${file.contentType};base64,${Buffer.from(file.bytes).toString("base64")}`);
    return { path };
  }
  async signedUrl(path: string): Promise<string> {
    return objects.get(path) ?? "";
  }
  async remove(path: string): Promise<void> {
    objects.delete(path);
  }
}

export function getStorage(): StoragePort {
  return new DemoStorageAdapter();
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 1_000_000;

/** Verifies magic bytes rather than trusting the client-supplied MIME type. */
export function sniffImageType(bytes: Uint8Array): (typeof ALLOWED_IMAGE_TYPES)[number] | null {
  if (bytes.length > 12) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    )
      return "image/webp";
  }
  return null;
}

/* ---------------- Payments ---------------- */

class DemoPaymentAdapter implements PaymentPort {
  readonly name = "demo" as const;
  readonly liveCharges = false as const;
  async createCheckout(): Promise<{ url: string | null }> {
    return { url: null };
  }
  async changePlan(): Promise<void> {}
  async cancelAtPeriodEnd(): Promise<void> {}
  async resume(): Promise<void> {}
}

class StripePaymentAdapter implements PaymentPort {
  readonly name = "stripe" as const;
  readonly liveCharges = false as const;
  private stripe = new Stripe(config.stripe.secretKey);

  async createCheckout(req: CheckoutRequest): Promise<{ url: string | null }> {
    const price = req.tier === "gold" ? config.stripe.priceGold : config.stripe.pricePlatinum;
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: req.email,
      client_reference_id: req.userId,
      metadata: { userId: req.userId, tier: req.tier },
      subscription_data: { metadata: { userId: req.userId, tier: req.tier } },
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
    });
    return { url: session.url };
  }
  async changePlan(id: string, tier: Tier): Promise<void> {
    const sub = await this.stripe.subscriptions.retrieve(id);
    const price = tier === "gold" ? config.stripe.priceGold : config.stripe.pricePlatinum;
    await this.stripe.subscriptions.update(id, {
      items: [{ id: sub.items.data[0].id, price }],
      metadata: { tier },
      proration_behavior: "create_prorations",
    });
  }
  async cancelAtPeriodEnd(id: string): Promise<void> {
    await this.stripe.subscriptions.update(id, { cancel_at_period_end: true });
  }
  async resume(id: string): Promise<void> {
    await this.stripe.subscriptions.update(id, { cancel_at_period_end: false });
  }
}

export function getPayments(): PaymentPort {
  return config.stripe.configured ? new StripePaymentAdapter() : new DemoPaymentAdapter();
}

export function stripeClient(): Stripe | null {
  return config.stripe.configured ? new Stripe(config.stripe.secretKey) : null;
}

/* ---------------- Age verification ---------------- */

class SelfDeclaredAgeAdapter implements AgeVerificationPort {
  readonly name = "self-declared";
  readonly isThirdParty = false;
  async start() {
    return { status: "self_declared" as const };
  }
}

/** Slot for Yoti / Veriff / Onfido / AgeChecked etc. Not implemented without a provider contract. */
class ProviderAgeStub implements AgeVerificationPort {
  readonly name = "provider-stub";
  readonly isThirdParty = true;
  async start(): Promise<never> {
    throw new NotConfiguredError("Age-verification provider", [
      "AGE_VERIFICATION_PROVIDER",
      "AGE_VERIFICATION_API_KEY",
    ]);
  }
}

export function getAgeVerification(): AgeVerificationPort {
  return config.ageVerificationProvider ? new ProviderAgeStub() : new SelfDeclaredAgeAdapter();
}
