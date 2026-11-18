-- ============================================================================
-- Guestlist share link
-- ============================================================================
-- Guestlist is no longer a public page. Each event owns an opaque token that
-- admins can copy and share directly with invited guests.
--
-- Security: anon may read public event fields but must never read
-- guestlist_token, otherwise the private link could be discovered from the
-- public event list via the Data API.
-- ============================================================================

alter table public.events
  add column guestlist_token uuid not null default gen_random_uuid();

alter table public.events
  add constraint events_guestlist_token_key unique (guestlist_token);

-- Replace table-level SELECT with an explicit column list without the token.
revoke select on public.events from anon;
grant select (
  id,
  name,
  slug,
  description,
  flyer_path,
  event_date,
  venue,
  whatsapp_number,
  registration_open,
  is_published,
  archived_at,
  created_at,
  updated_at
) on public.events to anon;
