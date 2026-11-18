| # | Check | Result | Detail |
|---|-------|--------|--------|
| 1 | anon: only published events are visible | PASS | status 200, rows 1 |
| 2 | anon: guestlist_token column is not readable | PASS | status 401 |
| 3 | anon: cannot insert events | PASS | status 401 |
| 4 | anon: cannot update events | PASS | status 401 |
| 5 | anon: cannot delete events | PASS | status 401 |
| 6 | anon: cannot read guestlist | PASS | status 401 |
| 7 | anon: cannot read submission_attempts | PASS | status 401 |
| 8 | anon: can read site_settings | PASS | status 200 |
| 9 | anon: cannot update site_settings | PASS | status 401 |
| 10 | anon: can read gallery metadata | PASS | status 200 |
| 11 | anon: cannot insert gallery metadata | PASS | status 401 |
| 12 | anon: guestlist link resolves published event | PASS | status 200, rows 1 |
| 13 | anon: guestlist link never resolves a draft | PASS | status 200, rows 0 |
| 14 | anon: random guestlist token returns no event | PASS | status 200, rows 0 |
| 15 | anon: cannot upload a proof object | PASS | status 400 |
| 16 | anon: cannot download a proof object | PASS | status 400 |
| 17 | anon: cannot upload to gallery bucket | PASS | status 400 |
| 18 | anon: can read public gallery object | PASS | status 200 |
| 19 | non-admin: cannot see draft events | PASS | status 200, rows 1 |
| 20 | non-admin: guestlist RLS returns no rows | PASS | status 200, rows 0 |
| 21 | non-admin: cannot insert events | PASS | status 403 |
| 22 | non-admin: cannot download proof objects | PASS | status 400 |
| 23 | staff: can see draft events | PASS | status 200, rows 2 |
| 24 | staff: can insert events | PASS | status 201 |
| 25 | staff: can update events | PASS | status 200 |
| 26 | staff: cannot delete events | PASS | status 200, deleted 0 |
| 27 | staff: cannot archive events (trigger) | PASS | status 400 |
| 28 | staff: can read guestlist | PASS | status 200 |
| 29 | staff: cannot insert guestlist rows directly | PASS | status 403 |
| 30 | staff: can review a pending submission (audit filled) | PASS | status 200, reviewed_by 5ac05b8e-1a32-4490-893f-d1869b866cb9 |
| 31 | staff: cannot revert review to pending | PASS | status 400 |
| 32 | staff: cannot delete guestlist rows | PASS | status 200, deleted 0 |
| 33 | staff: can update site_settings | PASS | status 200 |
| 34 | staff: can insert gallery metadata | PASS | status 201 |
| 35 | staff: can download proof objects | PASS | status 200 |
| 36 | staff: only sees their own admin profile | PASS | status 200, rows 1 |
| 37 | staff: cannot update another admin profile | PASS | status 200, rows 0 |
| 38 | super admin: sees every admin profile | PASS | status 200, rows 3 |
| 39 | super admin: can update admin profiles | PASS | status 200 |
| 40 | super admin: can archive events | PASS | status 200 |
| 41 | super admin: can delete guestlist rows | PASS | status 204 |
| 42 | super admin: can delete events | PASS | status 204 |
| 43 | super admin: can delete gallery metadata | PASS | status 204 |
