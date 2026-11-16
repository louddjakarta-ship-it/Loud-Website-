-- ============================================================================
-- LOUD JAKARTA — initial schema
-- ============================================================================
-- How to run:
--   1. Supabase Dashboard -> SQL Editor -> paste this file -> Run, or
--   2. `supabase db push` after linking the project.
--
-- This migration creates:
--   - enums, tables, constraints, indexes, updated_at triggers
--   - Row Level Security policies
--   - helper functions is_admin() / is_super_admin()
--   - storage buckets and storage policies
--
-- Security model (summary):
--   anon           : read published, non-archived events only
--   authenticated  : same as anon + own admin profile row
--   staff          : read/review guestlist, manage events (no delete/export)
--   super_admin    : full access
--   service_role   : bypasses RLS; used only by validated server code
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type public.admin_role as enum ('super_admin', 'staff');
create type public.guestlist_status as enum ('pending', 'approved', 'rejected');

-- ----------------------------------------------------------------------------
-- Shared trigger: updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- admin_profiles
-- One row per Supabase Auth user that is allowed into /admin.
-- ----------------------------------------------------------------------------
create table public.admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (
    display_name is null
    or char_length(trim(display_name)) between 1 and 80
  ),
  role public.admin_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_profiles_set_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- events
-- ----------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 140),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (
    description is null
    or char_length(description) <= 2000
  ),
  flyer_path text,
  event_date timestamptz not null,
  venue text check (
    venue is null
    or char_length(trim(venue)) between 1 and 160
  ),
  whatsapp_number text check (
    whatsapp_number is null
    or whatsapp_number ~ '^[1-9][0-9]{7,14}$'
  ),
  registration_open boolean not null default true,
  is_published boolean not null default false,
  archived_at timestamptz,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create index events_public_listing_idx
  on public.events (event_date)
  where is_published and archived_at is null;

create index events_created_at_idx
  on public.events (created_at desc);

-- ----------------------------------------------------------------------------
-- guestlist
-- Public submissions are inserted by the server with the service role only.
-- There is intentionally NO insert policy for anon/authenticated.
-- ----------------------------------------------------------------------------
create table public.guestlist (
  id uuid primary key default gen_random_uuid(),
  submission_key uuid not null unique,
  event_id uuid not null references public.events (id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  instagram text not null check (instagram ~ '^[a-z0-9._]{1,30}$'),
  story_proof_path text not null,
  comment_proof_path text not null,
  reference_person text not null check (
    char_length(trim(reference_person)) between 1 and 120
  ),
  status public.guestlist_status not null default 'pending',
  admin_note text check (
    admin_note is null
    or char_length(admin_note) <= 1000
  ),
  reviewed_by uuid references public.admin_profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint guestlist_review_consistency check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status <> 'pending' and reviewed_at is not null)
  )
);

-- Decision (approved): one Instagram = one submission per event, forever.
-- Rejected applicants must contact the team; a super_admin can delete the old
-- row if an exception is approved.
create unique index guestlist_unique_instagram_per_event
  on public.guestlist (event_id, instagram);

create index guestlist_event_created_idx
  on public.guestlist (event_id, created_at desc);

create index guestlist_status_created_idx
  on public.guestlist (status, created_at desc);

create index guestlist_instagram_idx
  on public.guestlist (instagram);

-- ----------------------------------------------------------------------------
-- submission_attempts (rate limiting; stores hashed IP only)
-- ----------------------------------------------------------------------------
create table public.submission_attempts (
  id bigserial primary key,
  ip_hash text not null,
  event_id uuid references public.events (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index submission_attempts_ip_time_idx
  on public.submission_attempts (ip_hash, created_at desc);

create index submission_attempts_created_idx
  on public.submission_attempts (created_at);

-- ----------------------------------------------------------------------------
-- Authorization helpers
-- SECURITY DEFINER + locked search_path so they bypass RLS safely.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
      and is_active = true
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
      and is_active = true
      and role = 'super_admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- Integrity triggers
-- ----------------------------------------------------------------------------

-- Only super_admin (or a trusted server/service-role call without a user
-- context) may archive an event.
create or replace function public.enforce_event_archive_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.archived_at is distinct from old.archived_at
     and auth.uid() is not null
     and not public.is_super_admin()
  then
    raise exception 'Only super_admin can archive or restore events';
  end if;

  return new;
end;
$$;

create trigger events_enforce_archive_permission
before update on public.events
for each row execute function public.enforce_event_archive_permission();

-- Keep review audit fields truthful and immutable when the status is unchanged.
create or replace function public.set_guestlist_review_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' and old.status <> 'pending' then
    raise exception 'Guestlist status cannot be reverted to pending';
  end if;

  if new.status is distinct from old.status then
    if auth.uid() is not null then
      new.reviewed_by = auth.uid();
    end if;
    new.reviewed_at = now();
  else
    new.reviewed_by = old.reviewed_by;
    new.reviewed_at = old.reviewed_at;
  end if;

  return new;
end;
$$;

create trigger guestlist_set_review_audit
before update on public.guestlist
for each row execute function public.set_guestlist_review_audit();

-- ----------------------------------------------------------------------------
-- Grants: keep anon away from private data, and restrict guestlist updates to
-- review-related columns even for authenticated admins.
-- ----------------------------------------------------------------------------
revoke all on public.admin_profiles from anon;
revoke all on public.guestlist from anon;
revoke all on public.submission_attempts from anon;
revoke all on public.submission_attempts from authenticated;

revoke update on public.guestlist from authenticated;
grant update (status, admin_note, reviewed_by, reviewed_at)
  on public.guestlist to authenticated;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.admin_profiles enable row level security;
alter table public.events enable row level security;
alter table public.guestlist enable row level security;
alter table public.submission_attempts enable row level security;

-- admin_profiles -------------------------------------------------------------
create policy "admin_profiles_select_own"
  on public.admin_profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy "admin_profiles_select_super_admin"
  on public.admin_profiles
  for select
  to authenticated
  using (public.is_super_admin());

create policy "admin_profiles_update_super_admin"
  on public.admin_profiles
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- events ---------------------------------------------------------------------
create policy "events_select_public"
  on public.events
  for select
  to anon, authenticated
  using (is_published = true and archived_at is null);

create policy "events_select_admin"
  on public.events
  for select
  to authenticated
  using (public.is_admin());

create policy "events_insert_admin"
  on public.events
  for insert
  to authenticated
  with check (public.is_admin());

create policy "events_update_admin"
  on public.events
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "events_delete_super_admin"
  on public.events
  for delete
  to authenticated
  using (public.is_super_admin());

-- guestlist ------------------------------------------------------------------
create policy "guestlist_select_admin"
  on public.guestlist
  for select
  to authenticated
  using (public.is_admin());

create policy "guestlist_update_admin"
  on public.guestlist
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "guestlist_delete_super_admin"
  on public.guestlist
  for delete
  to authenticated
  using (public.is_super_admin());

-- submission_attempts --------------------------------------------------------
-- No policies on purpose: service role only.

-- ----------------------------------------------------------------------------
-- Storage buckets
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'event-flyers',
    'event-flyers',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'guestlist-proofs',
    'guestlist-proofs',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update set
  "public" = excluded."public",
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read for published flyers. The bucket is public, so this policy only
-- controls listing/read through the storage API.
create policy "event_flyers_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'event-flyers');

-- Defense in depth: admins may read proof objects, but the UI always uses
-- short-lived signed URLs generated on the server.
create policy "guestlist_proofs_admin_read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'guestlist-proofs'
    and public.is_admin()
  );

-- Writes to both buckets are performed by the service role only.
-- No insert/update/delete policies are created for anon or authenticated.

-- ----------------------------------------------------------------------------
-- Documentation comments
-- ----------------------------------------------------------------------------
comment on table public.admin_profiles is
  'Admin users linked to auth.users. Role and is_active are enforced in RLS and server code.';
comment on table public.events is
  'Public event listing. Soft delete via archived_at.';
comment on table public.guestlist is
  'Guestlist submissions. Proof images live in the private guestlist-proofs bucket.';
comment on table public.submission_attempts is
  'Rate-limit log. Only SHA-256(ip + salt) is stored, never the raw IP.';
