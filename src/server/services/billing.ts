import { config } from "@/lib/config";
import { entitlementsFor, getPlan, tierRank } from "@/lib/plans";
import type { Payment, Subscription, Tier, User } from "@/lib/types";
import { uid } from "@/lib/utils";
import { getPayments, stripeClient } from "../adapters";
import { getStore, type Store } from "../store";

const DAY = 86_400_000;

/** Applies any scheduled downgrade/cancellation whose period has ended, then returns the subscription. */
export function currentSubscription(store: Store, userId: string): Subscription {
  let sub = store.subscriptions.get(userId);
  if (!sub) {
    sub = {
      userId, tier: "silver", status: "active", provider: "demo",
      currentPeriodEnd: new Date(Date.now() + 30 * DAY).toISOString(), cancelAtPeriodEnd: false,
    };
    store.subscriptions.set(userId, sub);
  }
  if (sub.provider === "demo" && new Date(sub.currentPeriodEnd).getTime() <= Date.now()) {
    if (sub.cancelAtPeriodEnd) {
      sub.tier = "silver";
      sub.cancelAtPeriodEnd = false;
      sub.pendingTier = undefined;
      sub.status = "active";
      sub.currentPeriodEnd = new Date(Date.now() + 30 * DAY).toISOString();
    } else if (sub.pendingTier) {
      sub.tier = sub.pendingTier;
      sub.pendingTier = undefined;
      sub.currentPeriodEnd = new Date(Date.now() + 30 * DAY).toISOString();
    }
  }
  return sub;
}

export function tierOf(store: Store, userId: string): Tier {
  const sub = currentSubscription(store, userId);
  return sub.status === "cancelled" ? "silver" : sub.tier;
}

export function entitlementsOfUser(store: Store, userId: string) {
  return entitlementsFor(tierOf(store, userId));
}

export interface PlanChangeResult {
  ok: boolean;
  message: string;
  redirectUrl?: string;
}

export async function changePlan(user: User, target: Tier, origin: string): Promise<PlanChangeResult> {
  const store = await getStore();
  const sub = currentSubscription(store, user.id);
  const plan = getPlan(target);
  if (target === sub.tier && !sub.pendingTier && !sub.cancelAtPeriodEnd) return { ok: false, message: `You are already on ${plan.name}.` };

  // Moving to Silver (free) is a cancellation of the paid plan at period end.
  if (target === "silver") return cancelSubscription(user);

  const payments = getPayments();
  const upgrading = tierRank(target) > tierRank(sub.tier);

  if (payments.name === "stripe") {
    if (sub.stripeSubscriptionId && sub.provider === "stripe") {
      await payments.changePlan(sub.stripeSubscriptionId, target);
      return { ok: true, message: `Your plan change to ${plan.name} has been sent to Stripe. It will be reflected shortly.` };
    }
    const { url } = await payments.createCheckout({
      userId: user.id, email: user.email, tier: target,
      successUrl: `${origin}/dashboard/subscription?checkout=success`,
      cancelUrl: `${origin}/dashboard/subscription?checkout=cancelled`,
    });
    if (!url) return { ok: false, message: "Could not start checkout." };
    return { ok: true, message: "Redirecting to secure checkout (Stripe test mode).", redirectUrl: url };
  }

  // Demo billing: no money moves.
  if (upgrading) {
    sub.tier = target;
    sub.pendingTier = undefined;
    sub.cancelAtPeriodEnd = false;
    sub.status = "active";
    sub.currentPeriodEnd = new Date(Date.now() + 30 * DAY).toISOString();
    store.payments.unshift({
      id: uid("pay_"), userId: user.id, amountPence: plan.pricePence, currency: "gbp",
      description: `${plan.name} membership (demo, no real charge)`, status: "succeeded", provider: "demo",
      createdAt: new Date().toISOString(),
    });
    return { ok: true, message: `You are now on ${plan.name}. (Demo billing: no real payment was taken.)` };
  }
  sub.pendingTier = target;
  sub.cancelAtPeriodEnd = false;
  return { ok: true, message: `You will move to ${plan.name} when the current period ends.` };
}

export async function cancelSubscription(user: User): Promise<PlanChangeResult> {
  const store = await getStore();
  const sub = currentSubscription(store, user.id);
  if (sub.tier === "silver") return { ok: false, message: "Silver is free, so there is nothing to cancel." };
  if (sub.provider === "stripe" && sub.stripeSubscriptionId) await getPayments().cancelAtPeriodEnd(sub.stripeSubscriptionId);
  sub.cancelAtPeriodEnd = true;
  sub.pendingTier = undefined;
  return { ok: true, message: "Your membership will end at the close of the current period. You keep access until then." };
}

export async function resumeSubscription(user: User): Promise<PlanChangeResult> {
  const store = await getStore();
  const sub = currentSubscription(store, user.id);
  if (!sub.cancelAtPeriodEnd) return { ok: false, message: "Your membership is not scheduled to end." };
  if (sub.provider === "stripe" && sub.stripeSubscriptionId) await getPayments().resume(sub.stripeSubscriptionId);
  sub.cancelAtPeriodEnd = false;
  return { ok: true, message: "Your membership will continue to renew." };
}

export async function billingHistory(userId: string): Promise<Payment[]> {
  const store = await getStore();
  return store.payments.filter((p) => p.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Handles verified Stripe webhook events. Called only from the signature-checked route handler. */
export async function applyStripeEvent(event: { type: string; data: { object: Record<string, unknown> } }): Promise<void> {
  const store = await getStore();
  const obj = event.data.object as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const metaUser: string | undefined = obj.metadata?.userId ?? obj.client_reference_id;
  switch (event.type) {
    case "checkout.session.completed": {
      if (!metaUser) return;
      const tier = (obj.metadata?.tier as Tier) ?? "gold";
      const sub = currentSubscription(store, metaUser);
      Object.assign(sub, {
        tier, status: "active", provider: "stripe", cancelAtPeriodEnd: false, pendingTier: undefined,
        stripeCustomerId: obj.customer as string, stripeSubscriptionId: obj.subscription as string,
        currentPeriodEnd: new Date(Date.now() + 30 * DAY).toISOString(),
      });
      break;
    }
    case "customer.subscription.updated": {
      const sub = [...store.subscriptions.values()].find((s) => s.stripeSubscriptionId === obj.id);
      if (!sub) return;
      sub.cancelAtPeriodEnd = Boolean(obj.cancel_at_period_end);
      const end = obj.items?.data?.[0]?.current_period_end ?? obj.current_period_end;
      if (typeof end === "number") sub.currentPeriodEnd = new Date(end * 1000).toISOString();
      sub.status = obj.status === "past_due" ? "past_due" : "active";
      break;
    }
    case "customer.subscription.deleted": {
      const sub = [...store.subscriptions.values()].find((s) => s.stripeSubscriptionId === obj.id);
      if (sub) Object.assign(sub, { tier: "silver", status: "active", cancelAtPeriodEnd: false, stripeSubscriptionId: undefined });
      break;
    }
    case "invoice.paid": {
      const sub = [...store.subscriptions.values()].find((s) => s.stripeCustomerId === obj.customer);
      if (!sub) return;
      store.payments.unshift({
        id: uid("pay_"), userId: sub.userId, amountPence: Number(obj.amount_paid ?? 0), currency: "gbp",
        description: `${getPlan(sub.tier).name} membership (Stripe test mode)`, status: "succeeded", provider: "stripe",
        createdAt: new Date().toISOString(),
      });
      break;
    }
  }
}

export function verifyStripeWebhook(rawBody: string, signature: string | null) {
  const stripe = stripeClient();
  if (!stripe || !config.stripe.webhookSecret || !signature) return null;
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  } catch {
    return null;
  }
}
