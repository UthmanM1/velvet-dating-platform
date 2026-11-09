import type { Gender, Intention } from "./types";

export const GENDER_LABEL: Record<Gender, string> = {
  woman: "Woman",
  man: "Man",
  non_binary: "Non-binary",
  other: "Another identity",
};
export const GENDERS = Object.keys(GENDER_LABEL) as Gender[];

export const INTENTION_LABEL: Record<Intention, string> = {
  long_term: "A long-term relationship",
  casual_dating: "Casual dating",
  companionship: "Companionship",
  exploring: "Open to exploring",
  discreet_connection: "A discreet connection",
};
export const INTENTIONS = Object.keys(INTENTION_LABEL) as Intention[];

export const INTERESTS = [
  "Travel",
  "Fine dining",
  "Wine tasting",
  "Live music",
  "Theatre",
  "Art galleries",
  "Fitness",
  "Hiking",
  "Cooking",
  "Photography",
  "Cinema",
  "Reading",
  "Yoga",
  "Dancing",
  "Cocktails",
  "Weekend escapes",
  "Sailing",
  "Golf",
  "Fashion",
  "Design",
] as const;

/** General locations only. Coordinates are used server-side for distance and never returned. */
export const CITIES: Record<string, { lat: number; lng: number }> = {
  London: { lat: 51.5074, lng: -0.1278 },
  Manchester: { lat: 53.4808, lng: -2.2426 },
  Birmingham: { lat: 52.4862, lng: -1.8904 },
  Leeds: { lat: 53.8008, lng: -1.5491 },
  Liverpool: { lat: 53.4084, lng: -2.9916 },
  Bristol: { lat: 51.4545, lng: -2.5879 },
  Edinburgh: { lat: 55.9533, lng: -3.1883 },
  Glasgow: { lat: 55.8642, lng: -4.2518 },
  Cardiff: { lat: 51.4816, lng: -3.1791 },
  Newcastle: { lat: 54.9783, lng: -1.6178 },
  Sheffield: { lat: 53.3811, lng: -1.4701 },
  Nottingham: { lat: 52.9548, lng: -1.1581 },
  Brighton: { lat: 50.8225, lng: -0.1372 },
  Oxford: { lat: 51.752, lng: -1.2577 },
  Cambridge: { lat: 52.2053, lng: 0.1218 },
  York: { lat: 53.959, lng: -1.0815 },
};
export const CITY_NAMES = Object.keys(CITIES);

export const REPORT_REASON_LABEL = {
  fake_profile: "Fake or misleading profile",
  harassment: "Harassment or unwanted contact",
  inappropriate_content: "Inappropriate content",
  underage: "Appears to be under 18",
  scam: "Scam or solicitation",
  other: "Something else",
} as const;
