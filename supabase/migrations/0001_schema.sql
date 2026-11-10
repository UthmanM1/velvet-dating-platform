-- VELVET core schema. Run with `supabase db push` (or paste into the SQL editor).
-- Demo/seed rows are flagged is_demo = true so they are always separable from real data.
create extension if not exists "pgcrypto";

create type account_role as enum ('member', 'admin');
create type account_status as enum ('pending_verification', 'active', 'suspended', 'banned');
create type tier as enum ('silver', 'gold', 'platinum');
create type gender as enum ('woman', 'man', 'non_binary', 'other');
create type intention as enum ('long_term', 'casual_dating', 'companionship', 'exploring', 'discreet_connection');
create type visibility as enum ('members', 'verified_only', 'hidden');
create type photo_status as enum ('pending', 'approved', 'rejected');
create type age_verification_status as enum ('self_declared', 'pending', 'provider_verified');

-- Users: 1:1 with auth.users (Supabase Auth). Email/password live in auth.users, never here.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  role account_role not null default 'member',
  status account_status not null default 'pending_verification',
  age_verification age_verification_status not null default 'self_declared',
  age_verification_provider text,
  age_verified_at timestamptz,
  moderation_note text,
  is_demo boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  dob date not null check (dob <= (current_date - interval '18 years')),   -- private, never returned to other members
  gender gender not null,
  interested_in gender[] not null default '{}',
  city text not null,                       -- general location only; no coordinates stored
  intention intention not null,
  bio text not null default '' check (char_length(bio) <= 1000),
  relationship_preferences text not null default '',
  smoking text, drinking text, children text, fitness text,
  visibility visibility not null default 'members',
  incognito boolean not null default false,
  show_online boolean not null default true,
  show_distance boolean not null default true,
  verified boolean not null default false,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index profiles_city_idx on public.profiles (city);
create index profiles_active_idx on public.profiles (last_active_at desc);

create table public.interests (
  id serial primary key,
  slug text unique not null,
  label text not null
);
create table public.profile_interests (
  user_id uuid references public.profiles (user_id) on delete cascade,
  interest_id int references public.interests (id) on delete cascade,
  primary key (user_id, interest_id)
);

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  storage_path text not null,               -- path in the PRIVATE `profile-photos` bucket
  status photo_status not null default 'pending',
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index one_primary_photo on public.profile_photos (user_id) where is_primary;

create table public.preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  marketing_consent boolean not null default false,
  analytics_consent boolean not null default false,
  notify_messages boolean not null default true
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('terms','privacy','age_confirmation','marketing','analytics')),
  granted boolean not null,
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.users (id) on delete cascade,
  user_b uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_conv_idx on public.messages (conversation_id, created_at);

create table public.favourites (
  user_id uuid references public.users (id) on delete cascade,
  target_id uuid references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, target_id)
);

create table public.interest_signals (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.users (id) on delete cascade,
  to_id uuid not null references public.users (id) on delete cascade,
  seen boolean not null default false,
  created_at timestamptz not null default now(),
  unique (from_id, to_id)
);

create table public.profile_views (
  viewer_id uuid references public.users (id) on delete cascade,
  target_id uuid references public.users (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid references public.users (id) on delete cascade,
  blocked_id uuid references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id) on delete cascade,
  target_id uuid not null references public.users (id) on delete cascade,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  resolved_by uuid references public.users (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references public.users (id) on delete cascade,
  tier tier not null default 'silver',
  status text not null default 'active' check (status in ('active','past_due','cancelled')),
  provider text not null default 'demo',
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  pending_tier tier,
  stripe_customer_id text,
  stripe_subscription_id text
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  amount_minor integer not null,
  currency text not null default 'gbp',
  description text not null,
  status text not null check (status in ('succeeded','refunded','failed')),
  provider text not null,
  stripe_event_id text unique,              -- webhook idempotency
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.users (id),
  action text not null,
  target_type text not null,
  target_id text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

-- Phase 2-6 extension points (empty on purpose; see docs/ROADMAP.md): matching_scores, communities,
-- creator_accounts, paid_content, media_assets, payouts.
