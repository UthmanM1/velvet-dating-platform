import type { Tier } from "./types";

export interface PlanEntitlements {
  discoveryPageSize: number;
  advancedSearch: boolean;
  messagesPerDay: number;
  interestsPerDay: number;
  maxFavourites: number;
  viewers: "count" | "recent" | "full";
  priorityVisibility: boolean;
  incognito: boolean;
  exclusiveFeatures: boolean;
}

export interface Plan {
  tier: Tier;
  name: string;
  blurb: string;
  /** Monthly price in pence. Placeholder values: set PLAN_PRICE_* to configure. */
  pricePence: number;
  features: string[];
  entitlements: PlanEntitlements;
}

function price(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const TIER_ORDER: Tier[] = ["silver", "gold", "platinum"];

export function getPlans(): Plan[] {
  return [
    {
      tier: "silver",
      name: "Silver",
      blurb: "Begin quietly. Browse and make a few introductions.",
      pricePence: price("PLAN_PRICE_SILVER_PENCE", 0),
      features: [
        "Basic member discovery",
        "Limited profile interactions",
        "5 messages per day",
        "Up to 10 favourites",
      ],
      entitlements: {
        discoveryPageSize: 12,
        advancedSearch: false,
        messagesPerDay: 5,
        interestsPerDay: 3,
        maxFavourites: 10,
        viewers: "count",
        priorityVisibility: false,
        incognito: false,
        exclusiveFeatures: false,
      },
    },
    {
      tier: "gold",
      name: "Gold",
      blurb: "Look further and speak more freely.",
      pricePence: price("PLAN_PRICE_GOLD_PENCE", 1499),
      features: [
        "Expanded discovery",
        "Advanced search: distance, interests, activity",
        "50 messages per day",
        "See who recently viewed your profile",
        "Up to 100 favourites",
      ],
      entitlements: {
        discoveryPageSize: 24,
        advancedSearch: true,
        messagesPerDay: 50,
        interestsPerDay: 25,
        maxFavourites: 100,
        viewers: "recent",
        priorityVisibility: false,
        incognito: false,
        exclusiveFeatures: false,
      },
    },
    {
      tier: "platinum",
      name: "Platinum",
      blurb: "The most discreet, most visible way to be on VELVET.",
      pricePence: price("PLAN_PRICE_PLATINUM_PENCE", 2999),
      features: [
        "Premium discovery",
        "Priority visibility in results",
        "Expanded messaging (500 per day)",
        "Incognito browsing and advanced privacy controls",
        "Full profile-view history",
        "Exclusive member features",
      ],
      entitlements: {
        discoveryPageSize: 24,
        advancedSearch: true,
        messagesPerDay: 500,
        interestsPerDay: 100,
        maxFavourites: 1000,
        viewers: "full",
        priorityVisibility: true,
        incognito: true,
        exclusiveFeatures: true,
      },
    },
  ];
}

export function getPlan(tier: Tier): Plan {
  const plan = getPlans().find((p) => p.tier === tier);
  if (!plan) throw new Error(`Unknown tier: ${tier}`);
  return plan;
}

export function entitlementsFor(tier: Tier): PlanEntitlements {
  return getPlan(tier).entitlements;
}

export function tierRank(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

export function formatPrice(pence: number): string {
  if (pence === 0) return "Free";
  return `£${(pence / 100).toFixed(2)}`;
}
