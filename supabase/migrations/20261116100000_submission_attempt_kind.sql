-- ============================================================================
-- LOUD JAKARTA — rate-limit attempt kinds
-- ============================================================================
-- The guestlist flow has two rate-limited endpoints:
--   upload : signed upload URL issuance (10 / 10 minutes / IP hash)
--   submit : final guestlist submission (5 / hour / IP hash)
--
-- Keeping the kind on the ledger lets each endpoint enforce its own window
-- without storing raw IP addresses.
-- ============================================================================

alter table public.submission_attempts
  add column if not exists kind text not null default 'upload'
  check (kind in ('upload', 'submit'));

drop index if exists public.submission_attempts_ip_time_idx;

create index if not exists submission_attempts_ip_kind_time_idx
  on public.submission_attempts (ip_hash, kind, created_at desc);

comment on column public.submission_attempts.kind is
  'Which rate-limited endpoint produced the attempt: upload or submit.';
