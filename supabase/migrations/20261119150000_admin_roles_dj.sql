-- ============================================================================
-- LOUD JAKARTA — DJ role and multi-role accounts
-- ============================================================================
-- One admin account can hold several roles (for example admin + DJ). The
-- legacy `role` column is kept for compatibility and set to the highest
-- privilege role; `roles` is the authoritative list used by the app.
--
-- The new enum value is added here and only referenced by the next migration,
-- because PostgreSQL cannot use a freshly added enum value in the same
-- transaction.
-- ============================================================================

alter type public.admin_role add value if not exists 'dj';

alter table public.admin_profiles
  add column if not exists roles public.admin_role[] not null default '{}';

update public.admin_profiles
set roles = array[role]
where roles = '{}'::public.admin_role[];

comment on column public.admin_profiles.roles is
  'All roles for this account. `role` is kept as the primary/highest role for compatibility.';
