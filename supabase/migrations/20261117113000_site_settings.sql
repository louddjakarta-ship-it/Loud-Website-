-- ============================================================================
-- Site settings (homepage hero copy)
-- ============================================================================
-- Singleton row so admins can edit the hero tagline and description from the
-- dashboard. Public read; only active admins can update.
-- ============================================================================

create table public.site_settings (
  id boolean primary key default true,
  hero_tagline text not null,
  hero_description text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id) on delete set null,
  constraint site_settings_singleton check (id),
  constraint site_settings_tagline_length check (
    char_length(trim(hero_tagline)) between 1 and 120
  ),
  constraint site_settings_tagline_lines check (
    (length(hero_tagline) - length(replace(hero_tagline, chr(10), ''))) <= 1
  ),
  constraint site_settings_description_length check (
    char_length(trim(hero_description)) between 1 and 400
  )
);

insert into public.site_settings (id, hero_tagline, hero_description)
values (
  true,
  $tag$We make
noise.$tag$,
  $desc$Underground nightlife, electronic music and contemporary culture. We don't follow the noise. We make it.$desc$
);

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

create policy "site_settings_select_public"
  on public.site_settings
  for select
  to anon, authenticated
  using (true);

create policy "site_settings_update_admin"
  on public.site_settings
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant update (hero_tagline, hero_description, updated_by)
  on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
