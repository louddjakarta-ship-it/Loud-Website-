-- ============================================================================
-- Public gallery
-- ============================================================================
-- Photos shown on the homepage. Only active admins may upload or delete;
-- everyone can read. Files live in the public `gallery-photos` bucket.
-- ============================================================================

create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique check (
    storage_path ~ '^[0-9a-f-]{36}\.(webp|jpg|jpeg|png)$'
  ),
  caption text check (
    caption is null
    or char_length(trim(caption)) between 1 and 160
  ),
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index gallery_photos_created_at_idx
  on public.gallery_photos (created_at desc);

alter table public.gallery_photos enable row level security;

create policy "gallery_photos_select_public"
  on public.gallery_photos
  for select
  to anon, authenticated
  using (true);

create policy "gallery_photos_insert_admin"
  on public.gallery_photos
  for insert
  to authenticated
  with check (private.is_admin());

create policy "gallery_photos_delete_admin"
  on public.gallery_photos
  for delete
  to authenticated
  using (private.is_admin());

revoke all on public.gallery_photos from anon, authenticated;
grant select on public.gallery_photos to anon, authenticated;
grant insert, delete on public.gallery_photos to authenticated;
grant all on public.gallery_photos to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery-photos',
  'gallery-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  "public" = excluded."public",
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "gallery_photos_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'gallery-photos');

create policy "gallery_photos_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'gallery-photos'
    and private.is_admin()
  );

create policy "gallery_photos_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'gallery-photos'
    and private.is_admin()
  );
