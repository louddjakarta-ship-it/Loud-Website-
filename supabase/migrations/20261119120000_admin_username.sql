-- ============================================================================
-- LOUD JAKARTA — username-based admin sign-in
-- ============================================================================
-- Admins sign in with a username instead of an email address. Supabase Auth
-- still verifies the password; the username is only a login handle that maps
-- to the auth user through public.admin_profiles.
--
-- Rules:
--   - lowercase, 3-32 chars
--   - starts with a letter or digit
--   - letters, digits, dot, underscore and dash only
-- ============================================================================

alter table public.admin_profiles
  add column if not exists username text;

alter table public.admin_profiles
  add constraint admin_profiles_username_format check (
    username is null
    or username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'
  );

create unique index if not exists admin_profiles_username_key
  on public.admin_profiles (username)
  where username is not null;

comment on column public.admin_profiles.username is
  'Login handle for /admin/login. Passwords are always verified by Supabase Auth.';
