| # | Check | Result | Detail |
|---|-------|--------|--------|
| 1 | ten wrong passwords are rejected generically | PASS | 10/10 generic |
| 2 | eleventh attempt is rate limited even with the right password | PASS | Too many sign-in attempts. Wait a few minutes before trying again. |
| 3 | login attempts are recorded in the hashed ledger | PASS | rows 10 |
