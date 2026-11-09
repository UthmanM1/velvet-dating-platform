import { createHash } from "node:crypto";

/** Pseudonymise identifiers so logs never contain raw emails or other personal data. */
export function pseudonym(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 10);
}

type Fields = Record<string, string | number | boolean | undefined>;

const FORBIDDEN = /email|password|token|dob|bio|message|body|address/i;

export function log(event: string, fields: Fields = {}): void {
  const safe: Fields = {};
  for (const [k, v] of Object.entries(fields)) {
    safe[k] = FORBIDDEN.test(k) ? "[redacted]" : v;
  }
  if (process.env.NODE_ENV === "test") return;
  console.log(JSON.stringify({ t: new Date().toISOString(), event, ...safe }));
}
