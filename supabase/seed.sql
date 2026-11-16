-- ============================================================================
-- LOUD JAKARTA — seed data
-- ============================================================================
-- Intentionally minimal. The only event is UNPUBLISHED so it can never leak
-- into production by accident. No guestlist rows and no admin users are seeded.
--
-- Create the first admin manually:
--   see docs/ADMIN_SETUP.md (PHASE 4)
-- ============================================================================

insert into public.events (
  id,
  name,
  slug,
  description,
  event_date,
  venue,
  registration_open,
  is_published
)
values (
  '00000000-0000-4000-8000-000000000001',
  'PLACEHOLDER — LOUD JAKARTA 001',
  'placeholder-loud-jakarta-001',
  'Placeholder event. Replace the name, date, venue and flyer from the admin dashboard before publishing.',
  '2026-12-31 22:00:00+07:00',
  'TBA — Jakarta',
  true,
  false
)
on conflict (slug) do nothing;
