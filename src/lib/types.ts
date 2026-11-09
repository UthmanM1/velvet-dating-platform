export type Role = "member" | "admin";
export type AccountStatus = "pending_verification" | "active" | "suspended" | "banned";
export type Tier = "silver" | "gold" | "platinum";
export type Gender = "woman" | "man" | "non_binary" | "other";
export type Intention =
  | "long_term"
  | "casual_dating"
  | "companionship"
  | "exploring"
  | "discreet_connection";
export type Visibility = "members" | "verified_only" | "hidden";
export type PhotoStatus = "pending" | "approved" | "rejected";

export interface Consent {
  type: "terms" | "privacy" | "age_confirmation" | "marketing" | "analytics";
  granted: boolean;
  at: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  isDemo: boolean;
  consents: Consent[];
  ageVerification: {
    status: "self_declared" | "pending" | "provider_verified";
    provider?: string;
    verifiedAt?: string;
  };
  moderationNote?: string;
}

export interface Photo {
  id: string;
  url: string;
  /** Opaque storage path for uploaded (non-seeded) photos. */
  path?: string;
  status: PhotoStatus;
  isPrimary: boolean;
  createdAt: string;
}

export interface Lifestyle {
  smoking: "never" | "socially" | "regularly";
  drinking: "never" | "socially" | "regularly";
  children: "none" | "have" | "want" | "open";
  fitness: "rarely" | "weekly" | "daily";
}

export interface Profile {
  userId: string;
  displayName: string;
  dob: string; // ISO date, private
  gender: Gender;
  interestedIn: Gender[];
  city: string;
  intention: Intention;
  bio: string;
  interests: string[];
  relationshipPreferences: string;
  lifestyle: Lifestyle;
  photos: Photo[];
  visibility: Visibility;
  incognito: boolean;
  showOnline: boolean;
  showDistance: boolean;
  verified: boolean;
  lastActiveAt: string;
  /** Seeded demo members get a synthetic, always-fresh activity level. */
  seedActivity?: "online" | "recent" | "day" | "week";
  createdAt: string;
}

/** What other members are allowed to see. Never includes email, DOB, coordinates. */
export interface PublicProfile {
  id: string;
  displayName: string;
  age: number;
  gender: Gender;
  city: string;
  intention: Intention;
  bio: string;
  interests: string[];
  relationshipPreferences: string;
  lifestyle: Lifestyle;
  photos: { id: string; url: string }[];
  primaryPhoto: string;
  online: boolean;
  lastActiveLabel: string;
  verified: boolean;
  distanceKm: number | null;
  tier: Tier;
  isFavourite?: boolean;
  isBlocked?: boolean;
}

export interface Conversation {
  id: string;
  participantIds: [string, string];
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt?: string;
}

export interface Favourite {
  userId: string;
  targetId: string;
  createdAt: string;
}

export interface InterestSignal {
  id: string;
  fromId: string;
  toId: string;
  createdAt: string;
  seen: boolean;
}

export interface Block {
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export type ReportReason = "fake_profile" | "harassment" | "inappropriate_content" | "underage" | "scam" | "other";

export interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  reason: ReportReason;
  details: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface Subscription {
  userId: string;
  tier: Tier;
  status: "active" | "past_due" | "cancelled";
  provider: "demo" | "stripe";
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  pendingTier?: Tier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface Payment {
  id: string;
  userId: string;
  amountPence: number;
  currency: "gbp";
  description: string;
  status: "succeeded" | "refunded" | "failed";
  provider: "demo" | "stripe";
  createdAt: string;
}

export type NotificationType = "message" | "interest" | "favourite" | "view" | "system" | "moderation";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

export interface ProfileView {
  viewerId: string;
  targetId: string;
  at: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetType: "user" | "photo" | "report" | "subscription" | "system";
  targetId: string;
  detail: string;
  at: string;
}

export interface TokenRecord {
  hash: string;
  userId: string;
  purpose: "verify_email" | "reset_password";
  expiresAt: number;
}

export interface OutboxEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  link?: string;
  at: string;
}
