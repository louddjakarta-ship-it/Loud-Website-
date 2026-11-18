| # | Check | Result | Detail |
|---|-------|--------|--------|
| 1 | upload-url rejects SVG | PASS | status 400, code validation_error |
| 2 | upload-url rejects files above the size limit | PASS | status 400 |
| 3 | upload-url issues a server-owned path | PASS | status 200, path 22a35831-1797-4f25-9… |
| 4 | submit rejects path traversal | PASS | status 400 |
| 5 | submit rejects spoofed image content (magic bytes) | PASS | status 400, code proof_invalid |
| 6 | submit accepts a valid registration as pending | PASS | status 200, status pending |
| 7 | API responses are not cached | PASS | cache-control no-store |
| 8 | retry with the same submission key returns the original row | PASS | status 200, id match true |
| 9 | duplicate Instagram on the same event is rejected | PASS | status 409, code duplicate_instagram |
| 10 | closed registration refuses upload URLs | PASS | status 409 |
| 11 | past events refuse upload URLs | PASS | status 409 |
| 12 | wrong guestlist token is refused | PASS | status 409 |
| 13 | oversized JSON bodies are refused | PASS | status 400 |
| 14 | eleventh upload-url in the window is rate limited | PASS | call 11, status 429, retry-after 592 |
| 15 | upload limiter allows ten signed URLs | PASS | statuses 200,200,200,200,200,200,200,200,200,200 |
| 16 | submit limiter allows five registrations | PASS | statuses 200,200,200,200,200,429 |
| 17 | sixth submission in the window is rate limited | PASS | status 429, retry-after 3591 |
| 18 | GET on upload-url is not allowed | PASS | status 405 |
