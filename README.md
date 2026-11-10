# VELVET - Connections Without Boundaries.

A premium dating platform for verified adults (18+). Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Zod validation,
Stripe (test mode) and a Supabase/PostgreSQL schema with Row Level Security.

> **Honest status.** The application runs end-to-end on a built-in **in-memory demo adapter**. The Supabase schema and RLS
> policies are provided but the runtime is **not yet wired to Supabase**. Stripe, email and third-party age verification are
> adapters that activate only when credentials are provided. Nothing is faked as "connected".

## Features
- Public site: home, about, discover (preview), plans, safety, FAQ, contact, terms, privacy, guidelines.
- Auth: registration (DOB, gender, preferences, location, intention, bio, 18+ confirmation), email verification,
  login/logout, password reset, scrypt salted password hashing, signed httpOnly sessions, protected routes, rate limiting.
- Profiles: edit, photo upload/remove (moderated), privacy + visibility, incognito (Platinum), block, report, favourites.
- Discovery: age, distance, gender, intention, interests, verified/online/recently-active filters, sorting, pagination.
- Messaging: conversations, timestamps, read receipts, unread badges, notifications, block/report. Demo mode uses
  server-side polling and simulated replies from seeded members (clearly demo behaviour).
- Subscriptions: Silver / Gold / Platinum, comparison, upgrade/downgrade, cancel/resume, billing history, renewal dates.
- Dashboard: profile completion, messages, interests, favourites, views, subscription, settings, privacy, notifications.
- Admin: members, profile/photo moderation, reports, suspension/banning, subscriptions, analytics, revenue, audit logs (RBAC).
- Privacy: data export, account deletion, consent records, no emails/DOB/coordinates in public responses, privacy-conscious logging.

## Architecture
```
src/app/            routes (public, dashboard, admin, api) and server actions
src/server/ports.ts interfaces: Email, Storage, Payment, AgeVerification (AWS migration: docs/AWS_MIGRATION.md)
src/server/adapters.ts demo + Stripe adapters, provider stubs
src/server/services domain logic (auth, members, messaging, billing, admin)
src/server/store.ts in-memory demo store + deterministic seed (all rows flagged isDemo)
supabase/migrations 0001 schema, 0002 RLS + private storage bucket; seed.sql reference data
docs/               AWS migration map, roadmap (phases 2-6 are extension points only)
```

## Run locally
```bash
npm install
cp .env.example .env.local   # set SESSION_SECRET (32+ chars)
npm run dev
```
Checks: `npm run lint && npm run typecheck && npm test && npm run build`.
Browser journeys: `npm start` then `BASE_URL=http://localhost:3000 node scripts/journeys.mjs` (needs Playwright).

## Environment variables
See `.env.example`. Required in production: `SESSION_SECRET`. Optional: `DEMO_MEMBER_PASSWORD`, `DEMO_ADMIN_PASSWORD`,
`PLAN_PRICE_*_PENCE`, `STRIPE_*`, `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `EMAIL_PROVIDER_API_KEY`,
`AGE_VERIFICATION_PROVIDER`.

## Demo credentials
- Member: `demo@velvet.example` / `VelvetDemo!2026` (override with `DEMO_MEMBER_PASSWORD`), Gold tier with seeded conversations.
- Admin: `admin@velvet.example` - exists **only** when `DEMO_ADMIN_PASSWORD` is set.
- All seeded members are fictional. Illustrative placeholder portraits are generated as SVG; supply licensed photography for production.
- Demo state is per server instance and resets on cold start. Verification/reset links are shown on screen in demo mode.

## Database setup (Supabase)
`supabase link && supabase db push`, then run `supabase/seed.sql`. Migrations have **not** been executed against a live
database in this repository's CI; review before use. Remaining work: implement the Supabase runtime adapter behind the services.

## Stripe (test mode)
Set `STRIPE_SECRET_KEY` (`sk_test_` or restricted `rk_test_`), `STRIPE_PRICE_GOLD`, `STRIPE_PRICE_PLATINUM`, and point a webhook at `/api/stripe/webhook`
with `STRIPE_WEBHOOK_SECRET`. Without these, billing runs in demo mode and no card is charged. Live keys are rejected.

## Age verification
Registration checks date of birth (18+) and records a self-declared status. This is **not** legally sufficient verification;
plug a provider into `AgeVerificationPort` before launch.

## Deployment (Vercel)
Import the repo, framework preset Next.js, set `SESSION_SECRET` (and any optional variables above), deploy.
