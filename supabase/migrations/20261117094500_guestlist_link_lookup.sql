-- ============================================================================
-- Guestlist link lookup
-- ============================================================================
-- The public guestlist page needs to resolve a share token to event details.
-- Anon must not read guestlist_token, so this SECURITY DEFINER function only
-- returns public event fields for an exact token match. The token is never
-- returned to the caller.
-- ============================================================================

create or replace function public.get_guestlist_event_link(link_token uuid)
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  flyer_path text,
  event_date timestamptz,
  venue text,
  whatsapp_number text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    e.name,
    e.slug,
    e.description,
    e.flyer_path,
    e.event_date,
    e.venue,
    e.whatsapp_number
  from public.events e
  where e.guestlist_token = link_token
    and e.is_published
    and e.archived_at is null
    and e.registration_open
    and e.event_date >= now()
  limit 1;
$$;

revoke all on function public.get_guestlist_event_link(uuid) from public;
grant execute on function public.get_guestlist_event_link(uuid) to anon, authenticated;
