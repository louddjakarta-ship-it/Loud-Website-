| # | Check | Result | Detail |
|---|-------|--------|--------|
| 1 | missing Turnstile token is rejected | PASS | status 400, code turnstile_failed |
| 2 | invalid Turnstile token is rejected | PASS | status 400, code turnstile_failed |
| 3 | rejected Turnstile attempts clean up their uploads | PASS | 0 orphan object(s) |
