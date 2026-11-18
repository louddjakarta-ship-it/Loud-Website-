-- ============================================================================
-- LOUD JAKARTA — demo events (LOCAL PREVIEW ONLY)
-- ============================================================================
-- Five PUBLISHED events with future dates so the homepage and guestlist form
-- can be previewed without real owner data. Do NOT run this against
-- production: unlike supabase/seed.sql, these rows are visible to the public.
--
-- Safe to re-run: slugs are unique and existing rows are left untouched.
-- Replace or delete them from /admin/events once real events exist.
-- ============================================================================

insert into public.events (
  name,
  slug,
  description,
  event_date,
  venue,
  registration_open,
  is_published
)
values
  (
    'LOUD JAKARTA 002 — NIGHT SHIFT',
    'loud-jakarta-002-night-shift',
    'Demo event for local preview. Lineup, flyer and venue details are placeholders and must be replaced before launch.',
    '2026-12-05 22:00:00+07:00',
    'Venue TBA — Jakarta',
    true,
    true
  ),
  (
    'LOUD JAKARTA 003 — CONCRETE ROOMS',
    'loud-jakarta-003-concrete-rooms',
    'Demo event for local preview. Lineup, flyer and venue details are placeholders and must be replaced before launch.',
    '2026-12-19 21:00:00+07:00',
    'Warehouse TBA — Jakarta',
    true,
    true
  ),
  (
    'LOUD JAKARTA 004 — AFTER HOURS',
    'loud-jakarta-004-after-hours',
    'Demo event for local preview. Lineup, flyer and venue details are placeholders and must be replaced before launch.',
    '2027-01-09 22:30:00+07:00',
    'Venue TBA — Jakarta',
    true,
    true
  ),
  (
    'LOUD JAKARTA 005 — SIGNAL LOST',
    'loud-jakarta-005-signal-lost',
    'Demo event for local preview. Lineup, flyer and venue details are placeholders and must be replaced before launch.',
    '2027-01-23 23:00:00+07:00',
    'Rooftop TBA — Jakarta',
    true,
    true
  ),
  (
    'LOUD JAKARTA 006 — LOW FREQUENCY',
    'loud-jakarta-006-low-frequency',
    'Demo event for local preview. Lineup, flyer and venue details are placeholders and must be replaced before launch.',
    '2027-02-14 21:00:00+07:00',
    'Venue TBA — Jakarta',
    true,
    true
  )
on conflict (slug) do nothing;
