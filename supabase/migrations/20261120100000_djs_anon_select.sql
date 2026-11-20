-- ============================================================================
-- LOUD JAKARTA — public DJ roster read fix
-- ============================================================================
-- The original `djs_select` policy was shared by `anon` and `authenticated`
-- and called `private.is_super_admin()`. That function is only executable by
-- `authenticated`, so PostgreSQL rejected every anonymous read of `public.djs`
-- ("permission denied for function is_super_admin") and the public roster
-- always fell back to the empty state.
--
-- Split the policy: anonymous visitors only see published presskits, while
-- signed-in users also see their own draft and super admins see everything.
-- ============================================================================

drop policy if exists "djs_select" on public.djs;

create policy "djs_select_public"
  on public.djs
  for select
  to anon
  using (is_published = true);

create policy "djs_select_authenticated"
  on public.djs
  for select
  to authenticated
  using (
    is_published = true
    or profile_id = (select auth.uid())
    or private.is_super_admin()
  );
