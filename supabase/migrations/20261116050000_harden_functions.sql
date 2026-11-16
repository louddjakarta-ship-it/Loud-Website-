-- ============================================================================
-- LOUD JAKARTA — hardening after the initial schema
-- ============================================================================
-- Fixes flagged by Supabase advisors:
--   1. SECURITY DEFINER functions were exposed in the public schema and
--      executable by anon/authenticated via /rest/v1/rpc.
--      -> moved to the non-exposed `private` schema.
--   2. public.set_updated_at had a mutable search_path.
--   3. Missing indexes on foreign keys.
--   4. Multiple permissive SELECT policies on admin_profiles and events.
--   5. submission_attempts had RLS enabled but no policy.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Private schema (not exposed through the Data API)
-- ----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Authorization helpers (private schema)
-- ----------------------------------------------------------------------------
create or replace function private.is_admin()
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

create or replace function private.is_super_admin()
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

revoke all on function private.is_admin() from public;
revoke all on function private.is_super_admin() from public;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_super_admin() to authenticated;

-- ----------------------------------------------------------------------------
-- Trigger functions (private schema)
-- ----------------------------------------------------------------------------
create or replace function private.enforce_event_archive_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.archived_at is distinct from old.archived_at
     and auth.uid() is not null
     and not private.is_super_admin()
  then
    raise exception 'Only super_admin can archive or restore events';
  end if;

  return new;
end;
$$;

create or replace function private.set_guestlist_review_audit()
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

revoke all on function private.enforce_event_archive_permission() from public;
revoke all on function private.set_guestlist_review_audit() from public;

drop trigger if exists events_enforce_archive_permission on public.events;
create trigger events_enforce_archive_permission
before update on public.events
for each row execute function private.enforce_event_archive_permission();

drop trigger if exists guestlist_set_review_audit on public.guestlist;
create trigger guestlist_set_review_audit
before update on public.guestlist
for each row execute function private.set_guestlist_review_audit();

-- ----------------------------------------------------------------------------
-- Recreate policies that referenced the old public helpers
-- ----------------------------------------------------------------------------
drop policy if exists "admin_profiles_select_own" on public.admin_profiles;
drop policy if exists "admin_profiles_select_super_admin" on public.admin_profiles;
drop policy if exists "admin_profiles_update_super_admin" on public.admin_profiles;

create policy "admin_profiles_select"
  on public.admin_profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or private.is_super_admin()
  );

create policy "admin_profiles_update_super_admin"
  on public.admin_profiles
  for update
  to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

drop policy if exists "events_select_public" on public.events;
drop policy if exists "events_select_admin" on public.events;
drop policy if exists "events_insert_admin" on public.events;
drop policy if exists "events_update_admin" on public.events;
drop policy if exists "events_delete_super_admin" on public.events;

create policy "events_select_public"
  on public.events
  for select
  to anon
  using (is_published = true and archived_at is null);

create policy "events_select_authenticated"
  on public.events
  for select
  to authenticated
  using (
    (is_published = true and archived_at is null)
    or private.is_admin()
  );

create policy "events_insert_admin"
  on public.events
  for insert
  to authenticated
  with check (private.is_admin());

create policy "events_update_admin"
  on public.events
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "events_delete_super_admin"
  on public.events
  for delete
  to authenticated
  using (private.is_super_admin());

drop policy if exists "guestlist_select_admin" on public.guestlist;
drop policy if exists "guestlist_update_admin" on public.guestlist;
drop policy if exists "guestlist_delete_super_admin" on public.guestlist;

create policy "guestlist_select_admin"
  on public.guestlist
  for select
  to authenticated
  using (private.is_admin());

create policy "guestlist_update_admin"
  on public.guestlist
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "guestlist_delete_super_admin"
  on public.guestlist
  for delete
  to authenticated
  using (private.is_super_admin());

drop policy if exists "guestlist_proofs_admin_read" on storage.objects;
create policy "guestlist_proofs_admin_read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'guestlist-proofs'
    and private.is_admin()
  );

-- Service role bypasses RLS, but an explicit policy keeps the advisors quiet
-- and documents that this table is intentionally server-only.
create policy "submission_attempts_service_role_all"
  on public.submission_attempts
  for all
  to service_role
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- Missing foreign-key indexes
-- ----------------------------------------------------------------------------
create index events_created_by_idx
  on public.events (created_by);

create index guestlist_reviewed_by_idx
  on public.guestlist (reviewed_by);

create index submission_attempts_event_id_idx
  on public.submission_attempts (event_id);

-- ----------------------------------------------------------------------------
-- Remove mutable search_path from the updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Drop the old public helpers now that nothing references them
-- ----------------------------------------------------------------------------
drop function public.enforce_event_archive_permission();
drop function public.set_guestlist_review_audit();
drop function public.is_admin();
drop function public.is_super_admin();
