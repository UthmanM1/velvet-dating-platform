-- Row Level Security. The app server uses the service role for privileged work (admin, webhooks);
-- everything reachable with the anon/authenticated keys is constrained below.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin' and u.status = 'active');
$$;

create or replace function public.is_blocked_pair(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.interests enable row level security;
alter table public.profile_interests enable row level security;
alter table public.profile_photos enable row level security;
alter table public.preferences enable row level security;
alter table public.consents enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.favourites enable row level security;
alter table public.interest_signals enable row level security;
alter table public.profile_views enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy interests_ref_read on public.interests for select using (auth.uid() is not null);

-- users: self read only; role/status can never be changed by the client.
create policy users_self_read on public.users for select using (id = auth.uid() or public.is_admin());

-- profiles: owners manage their own; members see visible, non-blocked profiles of active accounts.
-- NOTE: dob must not be exposed to other members: expose members through the `public_profiles` view below.
create policy profiles_owner_all on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_admin_read on public.profiles for select using (public.is_admin());

create view public.public_profiles with (security_invoker = false) as
select p.user_id as id, p.display_name, extract(year from age(p.dob))::int as age, p.gender, p.city, p.intention,
       p.bio, p.relationship_preferences, p.verified,
       case when p.show_online then p.last_active_at end as last_active_at
from public.profiles p
join public.users u on u.id = p.user_id
where u.status = 'active'
  and p.visibility <> 'hidden'
  and auth.uid() is not null
  and not public.is_blocked_pair(auth.uid(), p.user_id)
  and (p.visibility = 'members' or exists (select 1 from public.profiles me where me.user_id = auth.uid() and me.verified));
revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

create policy interests_read on public.profile_interests for select using (auth.uid() is not null);
create policy interests_owner_write on public.profile_interests for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- photos: owners manage; others see only APPROVED photos (served via signed URLs, bucket is private).
create policy photos_owner_all on public.profile_photos for all using (user_id = auth.uid()) with check (user_id = auth.uid() and status = 'pending');
create policy photos_member_read on public.profile_photos for select using (status = 'approved' and auth.uid() is not null and not public.is_blocked_pair(auth.uid(), user_id));
create policy photos_admin_all on public.profile_photos for all using (public.is_admin());

create policy prefs_owner on public.preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy consents_owner_read on public.consents for select using (user_id = auth.uid());
create policy consents_owner_insert on public.consents for insert with check (user_id = auth.uid());

create policy conv_participant on public.conversations for select using (auth.uid() in (user_a, user_b));
create policy conv_create on public.conversations for insert
  with check (auth.uid() in (user_a, user_b) and not public.is_blocked_pair(user_a, user_b));

create policy msg_read on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));
create policy msg_send on public.messages for insert with check (
  sender_id = auth.uid() and exists (
    select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)
      and not public.is_blocked_pair(c.user_a, c.user_b)));
create policy msg_mark_read on public.messages for update using (
  sender_id <> auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));

create policy fav_owner on public.favourites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy signals_send on public.interest_signals for insert with check (from_id = auth.uid());
create policy signals_read on public.interest_signals for select using (auth.uid() in (from_id, to_id));
create policy views_insert on public.profile_views for insert with check (viewer_id = auth.uid());
create policy views_target_read on public.profile_views for select using (target_id = auth.uid());
create policy blocks_owner on public.blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy reports_insert on public.reports for insert with check (reporter_id = auth.uid());
create policy reports_own_read on public.reports for select using (reporter_id = auth.uid() or public.is_admin());
create policy reports_admin_update on public.reports for update using (public.is_admin());

-- subscriptions/payments: read-only for owners; writes happen only through the service role (Stripe webhook).
create policy subs_owner_read on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());
create policy pay_owner_read on public.payments for select using (user_id = auth.uid() or public.is_admin());

create policy notif_owner on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy audit_admin_read on public.admin_audit_logs for select using (public.is_admin());
create policy audit_admin_insert on public.admin_audit_logs for insert with check (public.is_admin() and admin_id = auth.uid());

-- Private photo bucket. Objects are only readable through short-lived signed URLs minted server-side.
insert into storage.buckets (id, name, public) values ('profile-photos', 'profile-photos', false) on conflict do nothing;
create policy photos_bucket_owner_write on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_bucket_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
