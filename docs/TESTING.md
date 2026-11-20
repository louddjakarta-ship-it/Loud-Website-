# PHASE 5 — SECURITY & QA

Status: **selesai untuk lapisan otomatis dan audit kode; beberapa uji manual
butuh perangkat/akun nyata.**
Tanggal: 18 November 2026

Dokumen ini berisi checklist, hasil aktual, bug yang ditemukan, dan sisa
pekerjaan. Tabel hasil mentah ada di `docs/qa-*.md`.

---

## 1. Ringkasan hasil

| Area | Hasil | Bukti |
|------|-------|-------|
| Matriks RLS + Storage (anon / non-admin / staff / super admin) | **43/43 PASS** | `docs/qa-rls-results.md` |
| API guestlist: upload, spoofing, duplikat, rate limit | **18/18 PASS** | `docs/qa-api-results.md` |
| Turnstile wajib saat secret diisi | **3/3 PASS** | `docs/qa-turnstile-results.md` |
| Rate limit login admin | **3/3 PASS** | `docs/qa-login-results.md` |
| Responsive, keyboard, reduced motion, axe WCAG A/AA | **245/245 PASS** | `docs/qa-browser-results.md` |
| CSP nonce + security headers | PASS (lihat §4) | diuji dengan curl + browser |
| `npm audit --omit=dev` | **0 vulnerabilities** | output npm |
| `npm audit` (termasuk dev) | 14 high, **dev-only** (§6) | output npm |
| Supabase security advisors | 2 intentional + 1 action item (§7) | MCP advisors |
| `npm run lint` / `typecheck` / `build` | PASS | dijalankan 18 Nov 2026 |

Semua uji runtime dijalankan terhadap Supabase project asli
(`helzylxwjbhoodwbvpyk`) memakai data QA sementara yang dihapus lagi di akhir
setiap skrip, termasuk akun Auth, baris tabel, dan object Storage.

---

## 2. Cara menjalankan ulang

Prasyarat: `npm install`, `.env.local` berisi URL + publishable key + **secret
key asli**, dan server production berjalan.

```bash
npm run build
npm start -- -p 3100

# terminal lain
npm run qa:rls
npm run qa:api
npm run qa:browser

# Turnstile (server kedua dengan secret uji yang selalu gagal)
TURNSTILE_SECRET_KEY=2x0000000000000000000000000000000AA npm start -- -p 3101
QA_BASE_URL=http://127.0.0.1:3101 npm run qa:turnstile

# Rate limit login (butuh Playwright + Edge)
npm run qa:login

# DJ presskit end-to-end (butuh Playwright + Edge)
npm run qa:dj
```

Semua skrip menulis tabel hasil ke `docs/qa-*.md` bila
`QA_WRITE_DOCS=1`. Screenshot QA masuk ke `qa-artifacts/` (gitignored).

`qa:browser` memakai Microsoft Edge yang terpasang lewat `playwright-core`,
jadi tidak mengunduh browser Chromium tambahan. Set
`QA_GUESTLIST_TOKEN=<token>` untuk ikut mengaudit form guestlist privat.

`qa:rls`, `qa:api`, `qa:login`, `qa:turnstile`, dan `qa:dj` membuat lalu
menghapus:

- 3 akun Auth QA + `admin_profiles` (staff, super_admin, non-admin);
- event QA (published/draft/closed/expired);
- baris guestlist + object proof;
- baris/object gallery;
- akun DJ + baris `djs` + foto `dj-photos` (QA DJ);
- baris `submission_attempts` yang terkait event QA (cascade) atau login QA.

Jangan menjalankan skrip ini di production yang sudah berisi data nyata tanpa
memahami efeknya: skrip menghapus **hanya** data yang ia buat (ditandai QA),
tetapi tetap menulis ke project yang sama.

---

## 3. Matriks RLS dan Storage

Ringkasan 43 pemeriksaan (detail di `docs/qa-rls-results.md`):

| Aktor | Boleh | Ditolak |
|-------|-------|---------|
| anon | baca event published, `site_settings`, metadata gallery, public object gallery, RPC link guestlist | baca `guestlist_token`, guestlist, `submission_attempts`; insert/update/delete event; update `site_settings`; insert gallery metadata; upload/download object privat |
| authenticated non-admin | event published | draft event, guestlist, insert event, proof object |
| staff | lihat draft event, insert/update event, baca/review guestlist, update `site_settings`, metadata gallery, baca proof object, lihat profil sendiri | hapus event, arsip event (trigger), insert guestlist, delete guestlist, update profil admin lain, hapus metadata gallery |
| super_admin | semua aksi staff + hapus event/guestlist, arsip/restore, kelola profil admin, hapus metadata gallery | — |

Catatan penting:

- `DELETE` PostgREST mengembalikan 204 walau 0 baris terhapus. Uji karena itu
  memakai `Prefer: return=representation` **dan** mengecek ulang baris lewat
  service role. Ini sempat menghasilkan false positive di versi pertama skrip.
- Trigger audit mengisi `reviewed_by`/`reviewed_at`; status tidak bisa kembali
  ke `pending` (400).
- Trigger arsip menolak staff (400); super admin lolos.
- Kolom `guestlist_token` mengembalikan 401 untuk anon (grant kolom), bukan
  kebocoran data.

---

## 4. CSP dan header

CSP dibuat per request di `src/proxy.ts` dengan nonce acak
(`src/lib/security/csp.ts`).

```text
default-src 'self'
script-src 'self' 'nonce-<random>' 'strict-dynamic' https://challenges.cloudflare.com
style-src 'self' 'unsafe-inline'
img-src 'self' blob: data: https://*.supabase.co https://<project>.supabase.co
connect-src 'self' https://<project>.supabase.co wss://<project>.supabase.co
frame-src https://challenges.cloudflare.com
font-src 'self' data:; media-src 'self'; worker-src 'self' blob:
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
upgrade-insecure-requests (production only)
```

Catatan desain:

- `style-src` tetap `'unsafe-inline'` karena `next/image` merender atribut
  `style` (nonce tidak berlaku untuk atribut style). Script tetap strict.
- `'unsafe-eval'` hanya ditambahkan saat `NODE_ENV=development`.
- Semua halaman memakai `connection()` di root layout agar dirender dinamis,
  syarat nonce CSP. Konsekuensinya HTML tidak bisa di-cache CDN (data event
  memang dinamis).
- Zod di client dikonfigurasi `jitless: true`; tanpa ini Zod memanggil
  `Function("")` dan memicu pelanggaran `script-src eval` di form guestlist.
- Verifikasi browser: **0 pelanggaran CSP** di 5 halaman × 5 viewport, dan
  semua `<script>` pada HTML produksi memiliki nonce (dicek dengan curl).

Header lain (`next.config.ts`):

| Header | Nilai |
|--------|-------|
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |
| X-XSS-Protection | `0` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` |
| Cross-Origin-Opener-Policy | `same-origin` |
| X-Permitted-Cross-Domain-Policies | `none` |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` (production) |

Regresi auth setelah perubahan proxy: `/admin` → 307 ke login,
`/admin/login` → 200, `/api/admin/guestlist/export` → 401 untuk anon.

---

## 5. Uji API guestlist

18/18 PASS (`docs/qa-api-results.md`), mencakup:

- MIME di luar whitelist (SVG) → 400; ukuran di atas batas → 400.
- Path bukti selalu dibuat server (regex UUID/UUID.ext).
- Path traversal (`../../etc/passwd`) dan path milik event lain → 400.
- **Spoofed MIME**: file teks diunggah dengan `Content-Type: image/png`; route
  final menolak lewat magic bytes (`proof_invalid`) dan menghapus object.
- Submit valid → `pending`; response `cache-control: no-store`.
- Retry dengan `submissionKey` yang sama → baris yang sama (idempoten), object
  duplikat dihapus.
- Instagram duplikat per event → 409 `duplicate_instagram`.
- Guestlist ditutup, event lewat, dan token salah → 409.
- Body JSON > 16 KB → 400.
- Rate limit upload: 10 URL per 10 menit; percobaan ke-11 → 429 +
  `retry-after`.
- Rate limit submit: 5 per jam; percobaan ke-6 → 429 + `retry-after`.
- `GET /api/guestlist/upload-url` → 405.

Uji rate limit memakai header `x-forwarded-for` simulasi agar terisolasi dari
percobaan lain. Di Vercel header ini diisi platform, bukan client.

### Turnstile

Dengan `TURNSTILE_SECRET_KEY` diisi, token wajib:

- tanpa token → 400 `turnstile_failed`;
- token palsu → 400 `turnstile_failed` (siteverify menolak);
- upload yang sudah terlanjur dibuat ikut dihapus (0 orphan).

Uji memakai secret uji Cloudflare `2x…` (selalu gagal), bukan key produksi.
Saat secret kosong, verifikasi dilewati (mode development) — pastikan key asli
diisi sebelum deploy.

---

## 6. Dependensi

```text
npm audit --omit=dev  → 0 vulnerabilities
npm audit             → 14 high (semua di toolchain ESLint)
```

Semua temuan berasal dari `eslint-config-next` → `@next/eslint-plugin-next` →
`fast-glob`/`micromatch`/`picomatch`, dan `typescript-eslint` →
`minimatch`. Paket ini tidak dikirim ke browser/server produksi.
`npm audit fix --force` akan menaikkan versi mayor dan berisiko merusak
konfigurasi lint; ditunda ke PHASE 6 sambil memantau rilis
`eslint-config-next`.

---

## 7. Supabase advisors

| Temuan | Status |
|--------|--------|
| `get_guestlist_event_link` bisa dieksekusi anon sebagai SECURITY DEFINER | **Diterima**: fungsi hanya mengembalikan field publik untuk token UUID yang persis cocok; token tidak pernah dikembalikan. Alternatifnya memaksa anon membaca `guestlist_token`. |
| Leaked password protection disabled | **Action item owner**: aktifkan di Supabase Dashboard → Authentication → Password security (HaveIBeenPwned). Tidak bisa diaktifkan lewat SQL. |
| FK tanpa index (`gallery_photos.created_by`, `site_settings.updated_by`) | Diterima: tabel kecil/singleton, belum ada query yang memfilter kolom itu. |
| Index belum terpakai | Normal untuk database baru; akan dievaluasi setelah ada trafik. |

---

## 8. Responsive, keyboard, dan aksesibilitas

245/245 PASS (`docs/qa-browser-results.md`), 5 halaman (home, privacy, login,
404, form guestlist, termasuk mode mobile) × 5 viewport
(360, 390, 768, 1024, 1440):

- Tidak ada horizontal overflow.
- Tepat satu `<h1>` per halaman.
- Semua `<img>` punya atribut `alt`; semua kontrol form punya label.
- Tab pertama mencapai skip link "Skip to content".
- `prefers-reduced-motion: reduce` mematikan smooth scroll dan animasi.
- axe (WCAG 2.0/2.1 A + AA) tanpa pelanggaran.
- Tidak ada error console/page dan tidak ada pelanggaran CSP.

Run yang sama juga dijalankan terhadap production
`https://loud-jakarta.vercel.app` dengan hasil **245/245 PASS**, termasuk
header CSP/HSTS dan redirect `/admin`.

Bug yang ditemukan dan diperbaiki:

1. **Kontras label footer** `text-muted/60` hanya 2.73:1. Diganti `text-muted`
   (≈5.9:1) di footer dan dashboard admin.
2. **Zod eval** memicu pelanggaran CSP di form guestlist. Diperbaiki dengan
   `z.config({ jitless: true })`.
3. **Uji RLS false positive** karena `DELETE` 204 tanpa baris terhapus.
   Diperbaiki di skrip, bukan di aplikasi.
4. **Label-in-name (WCAG 2.5.3)** pada tombol RSVP: `aria-label` menyisipkan
   nama event di tengah sehingga teks terlihat tidak lagi terkandung dalam
   nama aksesibel. Diubah menjadi `RSVP via WhatsApp for <event>`.
5. **Kontras 404 dekoratif**: angka "404" besar memakai warna `text-line` dan
   dilaporkan axe meski `aria-hidden`. Dipindah ke pseudo-element
   (`before:content-['404']`), sehingga tetap dekoratif tanpa menjadi teks
   yang harus memenuhi kontras.
6. **Console noise halaman 404**: browser mencatat respons dokumen 404 sebagai
   error console. Skrip QA sekarang mengabaikan pesan itu hanya saat
   `expect === 404`; error lain tetap menggagalkan uji.

### Yang masih manual

| Uji | Kenapa belum otomatis |
|-----|------------------------|
| Screen reader nyata (NVDA/VoiceOver/TalkBack) | Butuh aplikasi pembaca layar dan penilaian manusia atas urutan baca |
| Perangkat fisik (iOS Safari/Android Chrome) | Emulasi viewport bukan perangkat nyata |
| Approve/reject admin dengan bukti asli end-to-end | Butuh akun admin dan submission nyata |
| Login + logout melalui UI admin asli | Butuh kredensial admin produksi |
| Turnstile dengan key produksi | Butuh key Cloudflare asli |
| CSP report-only monitoring | Belum ada endpoint pelaporan; opsional setelah deploy |

---

## 9. Perubahan kode pada PHASE 5

```text
src/proxy.ts                          # nonce CSP untuk semua halaman + alur admin
src/lib/security/csp.ts               # builder CSP (baru)
src/app/layout.tsx                    # connection() untuk nonce
src/lib/rate-limit.ts                 # kind "login" + login limiter
src/app/admin/login/actions.ts        # rate limit sebelum signInWithPassword
src/lib/validation/guestlist.ts       # zod jitless (CSP)
src/components/public/site-footer.tsx # kontras label
src/components/public/event-card.tsx  # label-in-name tombol RSVP
src/app/not-found.tsx                 # 404 dekoratif via pseudo-element
src/app/admin/(dashboard)/page.tsx    # kontras label
src/app/layout.tsx, next.config.ts    # header keamanan
supabase/migrations/20261118090000_login_rate_limit.sql
scripts/qa-{rls,api,browser,turnstile,login}.mjs
eslint.config.mjs                     # ignore qa-artifacts
package.json                          # skrip qa:*
docs/qa-*-results.md                  # hasil mentah
```

---

## 10. PHASE 6 — Scheduled orphan cleanup (19 November 2026)

Route `GET /api/cron/cleanup-orphans` menghapus bukti guestlist yang tidak
direferensikan dan berumur >24 jam. Vercel Schedules memanggilnya harian
03:00 Asia/Jakarta (`vercel.json`) dengan `Authorization: Bearer
$CRON_SECRET`.

| Uji | Hasil |
|-----|-------|
| Tanpa header Authorization → `401 unauthorized` | PASS |
| Bearer token salah → `401 unauthorized` | PASS |
| `CRON_SECRET` kosong → `503 cron_not_configured` (tidak jalan) | PASS |
| Token valid + `?dry=1` → `200`, `scanned/orphans/deleted` tanpa path | PASS |
| `lint` / `typecheck` / `build` | PASS |

Uji dijalankan lokal pada 19 Nov 2026. Pemanggilan nyata (tanpa `?dry=1`)
belum dijalankan terhadap production karena bucket saat itu kosong; schedule
pertama akan terlihat di Vercel → **Schedules** setelah deploy.

---

## 11. PHASE 7 — DJ presskit (20 November 2026)

`npm run qa:dj` menguji alur lengkap: super admin membuat akun DJ-only,
DJ login dan mendarat di `/dj`, menyimpan presskit + foto, presskit tampil di
`/djs`, `/djs/<slug>`, dan `/#djs`, draft disembunyikan, dan guard role
diuji dua arah. Skrip membersihkan akun, baris `djs`, dan foto setelah selesai.

| Uji | Hasil |
|-----|-------|
| Super admin membuat akun DJ-only dari `/admin/users` | PASS |
| Akun baru hanya punya role `dj` | PASS |
| Login DJ-only → `/dj`, bukan `/admin` | PASS |
| DJ bisa membuka `/dj/account` | PASS |
| Simpan presskit + upload foto WebP | PASS |
| Baris `djs` menyimpan foto, genre, venue, Instagram, publish state | PASS |
| `/djs/<slug>` → `200`, stage name, genre, venue, foto tampil | PASS |
| `/djs` dan homepage `#djs` menampilkan presskit | PASS |
| Pengunjung anonim bisa membuka `/djs` dan `/djs/<slug>` | PASS |
| Unpublish → `/djs/<slug>` `404` | PASS |
| Admin tanpa role `dj` diblokir dari `/dj` | PASS |
| Tidak ada error halaman di browser | PASS |
| `lint` / `typecheck` / `build` | PASS |

Total **24/24 PASS**. QA ini juga menemukan dan memperbaiki dua bug nyata:
textarea genre/venue menolak CRLF hasil paste dari dokumen Windows, dan
policy `djs_select` membuat pengunjung anonim gagal membaca roster (policy
dipisah lewat `20261120100000_djs_anon_select.sql`). Detail ada di
`docs/PHASE-7-DJ.md`.
