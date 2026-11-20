-- ============================================================================
-- LOUD JAKARTA — DJ presskit
-- ============================================================================
-- Public visitors can read published DJ presskits. Only an active account
-- with the `dj` role can create or edit its own presskit. A super admin can
-- read all presskits (including drafts) but cannot edit them unless that same
-- account also holds the `dj` role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Role helpers
-- ----------------------------------------------------------------------------
create or replace function private.has_role(role_name public.admin_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and (p.role = role_name or role_name = any(p.roles))
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    private.has_role('super_admin'::public.admin_role)
    or private.has_role('staff'::public.admin_role);
$$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.has_role('super_admin'::public.admin_role);
$$;

create or replace function private.is_dj()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.has_role('dj'::public.admin_role);
$$;

revoke all on function private.has_role(public.admin_role) from public;
revoke all on function private.is_dj() from public;
grant execute on function private.has_role(public.admin_role) to authenticated;
grant execute on function private.is_dj() to authenticated;

-- ----------------------------------------------------------------------------
-- djs
-- ----------------------------------------------------------------------------
create table public.djs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique
    references public.admin_profiles (id) on delete cascade,
  stage_name text not null check (
    char_length(trim(stage_name)) between 1 and 80
  ),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  bio text check (
    bio is null
    or char_length(bio) <= 2000
  ),
  photo_path text,
  genres text[] not null default '{}',
  venues text[] not null default '{}',
  instagram_url text check (
    instagram_url is null
    or instagram_url ~ '^https://(www\.)?instagram\.com/'
  ),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint djs_genres_limit check (
    array_length(genres, 1) is null
    or array_length(genres, 1) <= 12
  ),
  constraint djs_venues_limit check (
    array_length(venues, 1) is null
    or array_length(venues, 1) <= 50
  )
);

create trigger djs_set_updated_at
before update on public.djs
for each row execute function public.set_updated_at();

create index djs_published_idx
  on public.djs (created_at desc)
  where is_published;

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
revoke all on public.djs from anon;
revoke all on public.djs from authenticated;

grant select on public.djs to anon;
grant select, insert, update, delete on public.djs to authenticated;
grant all on public.djs to service_role;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.djs enable row level security;

create policy "djs_select"
  on public.djs
  for select
  to anon, authenticated
  using (
    is_published = true
    or profile_id = (select auth.uid())
    or private.is_super_admin()
  );

create policy "djs_insert_dj"
  on public.djs
  for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and private.is_dj()
  );

create policy "djs_update_dj"
  on public.djs
  for update
  to authenticated
  using (
    profile_id = (select auth.uid())
    and private.is_dj()
  )
  with check (
    profile_id = (select auth.uid())
    and private.is_dj()
  );

create policy "djs_delete_dj"
  on public.djs
  for delete
  to authenticated
  using (
    profile_id = (select auth.uid())
    and private.is_dj()
  );

-- ----------------------------------------------------------------------------
-- Storage: public DJ photos, writable only by the owning DJ account
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dj-photos',
  'dj-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  "public" = excluded."public",
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "dj_photos_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'dj-photos');

create policy "dj_photos_dj_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'dj-photos'
    and private.is_dj()
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "dj_photos_dj_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'dj-photos'
    and private.is_dj()
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'dj-photos'
    and private.is_dj()
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "dj_photos_dj_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'dj-photos'
    and private.is_dj()
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

comment on table public.djs is
  'DJ presskit. Public read when published; only the owning dj-role account can edit.';
