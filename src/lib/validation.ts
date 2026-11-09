import { z } from "zod";
import { CITY_NAMES, INTERESTS } from "./reference";
import { ageFromDob } from "./utils";

export const GENDER_VALUES = ["woman", "man", "non_binary", "other"] as const;
export const INTENTION_VALUES = [
  "long_term",
  "casual_dating",
  "companionship",
  "exploring",
  "discreet_connection",
] as const;

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Use 128 characters or fewer.")
  .refine((p) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p), {
    message: "Include upper-case, lower-case and a number.",
  });

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);

const dobSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth.")
  .refine((d) => ageFromDob(d) >= 0, "Enter a valid date of birth.")
  .refine((d) => ageFromDob(d) >= 18, "You must be at least 18 to join VELVET.")
  .refine((d) => ageFromDob(d) <= 110, "Enter a valid date of birth.");

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(30, "Display name must be 30 characters or fewer.")
    .regex(/^[\p{L}\p{N} .'_-]+$/u, "Display name contains unsupported characters."),
  email: emailSchema,
  password: passwordSchema,
  dob: dobSchema,
  gender: z.enum(GENDER_VALUES),
  interestedIn: z.array(z.enum(GENDER_VALUES)).min(1, "Choose at least one."),
  city: z.enum(CITY_NAMES as [string, ...string[]]),
  intention: z.enum(INTENTION_VALUES),
  bio: z.string().trim().min(20, "Tell us a little more (20+ characters).").max(600),
  confirmAge: z.literal(true, { error: "You must confirm you are 18 or over." }),
  acceptTerms: z.literal(true, { error: "You must accept the terms and privacy policy." }),
  marketingConsent: z.boolean().default(false),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const resetRequestSchema = z.object({ email: emailSchema });
export const resetSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  message: z.string().trim().min(10, "Please write a little more.").max(2000),
});

export const profileUpdateSchema = z.object({
  displayName: registerSchema.shape.displayName,
  city: registerSchema.shape.city,
  intention: registerSchema.shape.intention,
  bio: registerSchema.shape.bio,
  interestedIn: registerSchema.shape.interestedIn,
  interests: z
    .array(z.enum(INTERESTS as unknown as [string, ...string[]]))
    .max(12, "Choose up to 12 interests."),
  relationshipPreferences: z.string().trim().max(400),
  smoking: z.enum(["never", "socially", "regularly"]),
  drinking: z.enum(["never", "socially", "regularly"]),
  children: z.enum(["none", "have", "want", "open"]),
  fitness: z.enum(["rarely", "weekly", "daily"]),
});

export const privacySchema = z.object({
  visibility: z.enum(["members", "verified_only", "hidden"]),
  showOnline: z.boolean(),
  showDistance: z.boolean(),
  incognito: z.boolean(),
  marketingConsent: z.boolean(),
  analyticsConsent: z.boolean(),
});

export const messageSchema = z.object({
  to: z.string().min(1).max(100),
  body: z.string().trim().min(1, "Write a message first.").max(2000, "Messages are limited to 2000 characters."),
});

export const reportSchema = z.object({
  targetId: z.string().min(1).max(100),
  reason: z.enum(["fake_profile", "harassment", "inappropriate_content", "underage", "scam", "other"]),
  details: z.string().trim().max(1000).default(""),
});

export const discoverQuerySchema = z.object({
  ageMin: z.coerce.number().int().min(18).max(99).default(18),
  ageMax: z.coerce.number().int().min(18).max(99).default(99),
  gender: z.enum(GENDER_VALUES).optional(),
  intention: z.enum(INTENTION_VALUES).optional(),
  city: z.enum(CITY_NAMES as [string, ...string[]]).optional(),
  distance: z.coerce.number().int().min(5).max(1000).optional(),
  interest: z.enum(INTERESTS as unknown as [string, ...string[]]).optional(),
  online: z.coerce.boolean().optional(),
  verified: z.coerce.boolean().optional(),
  recent: z.coerce.boolean().optional(),
  sort: z.enum(["relevance", "active", "newest", "distance", "age"]).default("relevance"),
  page: z.coerce.number().int().min(1).max(500).default(1),
});
export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;

/** Flattens zod issues into {field: message}. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
