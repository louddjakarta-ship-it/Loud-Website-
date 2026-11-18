-- ============================================================================
-- LOUD JAKARTA — admin login rate limit
-- ============================================================================
-- The admin sign-in action now writes to the same hashed-attempt ledger as the
-- guestlist endpoints. The stored value is SHA-256(ip + email + salt), never a
-- raw IP or email address.
-- ============================================================================

alter table public.submission_attempts
  drop constraint if exists submission_attempts_kind_check;

alter table public.submission_attempts
  add constraint submission_attempts_kind_check
  check (kind in ('upload', 'submit', 'login'));

comment on column public.submission_attempts.kind is
  'Which rate-limited endpoint produced the attempt: upload, submit or login.';

comment on table public.submission_attempts is
  'Rate-limit log. Stores only SHA-256(identifier + salt): the client IP for guestlist, IP + email for admin login.';
