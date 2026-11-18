-- ============================================================================
-- Event Google Maps link
-- ============================================================================
-- Optional link to the venue on Google Maps. Only admins can write it (event
-- writes already go through admin server actions + RLS). It is public data, so
-- anon gets SELECT on this one column only.
-- ============================================================================

alter table public.events add column maps_url text;

alter table public.events
  add constraint events_maps_url_check
  check (
    maps_url is null
    or (
      char_length(maps_url) <= 500
      and maps_url ~ '^https://(maps\.app\.goo\.gl/[^[:space:]]+|goo\.gl/maps/[^[:space:]]+|(www\.)?google\.[a-z.]+/maps[^[:space:]]*|maps\.google\.[a-z.]+/[^[:space:]]*)$'
    )
  );

-- The existing anon grant is column-level; add the new public column.
grant select (maps_url) on public.events to anon;
