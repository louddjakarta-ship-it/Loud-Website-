# PHASE 3 — PUBLIC WEBSITE

Status: **implemented locally, build passing, end-to-end guestlist submission
pending a real `SUPABASE_SECRET_KEY`.**
Tanggal: 16 November 2026

> **Revisi 17 November 2026 — guestlist link-only.** Guestlist bukan lagi
> halaman publik. Setiap event punya token acak dan admin membagikan
> `/guestlist/<token>` langsung ke tamu. Pengunjung umum hanya melihat
> upcoming events + tombol RSVP WhatsApp. Detail di §9.

Dokumen acuan: `docs/PHASE-1-PLANNING.md` §3, §4.3, §6, §7 dan
`LOUD_JAKARTA_Master_Prompt.md` §4–5.

---

## 1. Scope yang selesai

| Area | Status | File utama |
|------|--------|------------|
| Homepage (header, hero, event grid, footer) | Selesai | `src/app/(site)/page.tsx`, `src/components/public/*` |
| Hero tagline + description dari `site_settings` (fallback default) | Selesai | `src/lib/data/site-settings.ts` |
| Event cards dari database + flyer/placeholder | Selesai | `src/components/public/event-card.tsx`, `src/lib/data/events.ts` |
| WhatsApp RSVP per event + fallback env + disabled state | Selesai | `src/lib/whatsapp.ts` |
| Link Google Maps per event (opsional, tampil di card) | Selesai | `src/components/public/event-card.tsx` |
| Gallery foto homepage (admin upload, publik lihat) | Selesai | `src/components/public/gallery.tsx`, `src/lib/data/gallery.ts` |
| Guestlist link privat per event (`/guestlist/[token]`) | Selesai | `src/app/(site)/guestlist/[token]/page.tsx` |
| Guestlist form 5 field + 2 upload (event terkunci ke link) | Selesai | `src/components/public/guestlist-form.tsx` |
| Kompresi + preview + drag/drop + progress | Selesai | `src/lib/images/compress.ts`, `src/components/public/proof-upload.tsx` |
| Signed upload URL (direct-to-storage) | Selesai | `src/app/api/guestlist/upload-url/route.ts` |
| Final submission + magic-byte verification + duplicate handling | Selesai | `src/app/api/guestlist/route.ts`, `src/lib/storage/proofs.ts` |
| Rate limiting per IP hash | Selesai | `src/lib/rate-limit.ts` |
| Turnstile opsional | Selesai (belum dikonfigurasi) | `src/lib/turnstile.ts`, `src/components/public/turnstile-widget.tsx` |
| Privacy notice | Selesai | `src/app/(site)/privacy/page.tsx` |
| 404, sitemap, robots, favicon | Selesai | `src/app/not-found.tsx`, `sitemap.ts`, `robots.ts`, `icon.svg` |
| Orphan proof cleanup script | Selesai | `scripts/cleanup-orphans.mjs` |

---

## 2. Route publik

| Route | Tipe | Catatan |
|-------|------|---------|
| `/` | RSC (dynamic) | Event published, belum mulai, belum archived |
| `/guestlist` | RSC | Selalu `404` — pintu masuk hanya lewat link admin |
| `/guestlist/[token]` | RSC + client form | Token UUID per event, event terkunci |
| `/privacy` | Static RSC | Privacy notice |
| `/api/guestlist/upload-url` | POST | Signed upload URL per slot, wajib `guestlistToken` |
| `/api/guestlist` | POST | Validasi final + insert `pending`, wajib `guestlistToken` |
| `/sitemap.xml`, `/robots.txt` | Metadata route | `/admin`, `/api`, `/guestlist` disallow |
| `/icon.svg` | Static | Favicon placeholder |

Tidak ada halaman detail event pada MVP; semua informasi ada di card.

---

## 3. Alur guestlist (implementasi aktual)

```text
Browser                          Server                         Supabase
  │ 1. POST /api/guestlist/upload-url { eventId, guestlistToken, slot, mime, size }
  │ ─────────────────────────────► │ cek event + token cocok
  │                                │ rate limit (10 / 10 menit / IP hash)
  │                                │ buat path + signed upload token
  │ 2. { path, token } ◄─────────── │
  │ 3. uploadToSignedUrl(path, token, blob) ─────────────────────► storage
  │ 4. POST /api/guestlist { fields, eventId, guestlistToken, paths, submissionKey, turnstileToken }
  │ ─────────────────────────────► │ cek event + token cocok
  │                                │ rate limit (5 / jam / IP hash)
  │                                │ download 2 file + magic bytes + size
  │                                │ verifikasi Turnstile (jika aktif)
  │                                │ insert guestlist (service role)
  │ 5. { id, status: "pending" } ◄── │
```

Detail keamanan:

- Path dibuat server: `{event_id}/{random_uuid}.{jpg|png|webp}`. Client tidak
  pernah memilih nama file.
- Bucket `guestlist-proofs` private, limit 5 MB, MIME `image/jpeg`,
  `image/png`, `image/webp`.
- File diverifikasi ulang setelah upload: magic bytes (`FF D8 FF`,
  `89 50 4E 47`, `RIFF....WEBP`) dan ekstensi harus cocok.
- `submission_key` idempotent: retry jaringan mengembalikan baris yang sama,
  bukan membuat duplikat.
- Duplikat Instagram per event memakai unique index dan mengembalikan 409
  generik. Status lama (pending/approved/rejected) tidak dibocorkan.
- Jika insert gagal, kedua file baru dihapus. File orphan dari kegagalan
  jaringan dibersihkan oleh `npm run cleanup:orphans`.
- Semua error API berbentuk
  `{ ok: false, error: { code, message, fields? } }` dan `cache-control:
  no-store`.
- IP hanya disimpan sebagai `SHA-256(ip + RATE_LIMIT_SALT)`.

Rate limit:

| Endpoint | Window | Limit | Tabel |
|----------|--------|-------|-------|
| `upload-url` | 10 menit | 10 request / IP hash | `submission_attempts.kind = 'upload'` |
| `guestlist` | 60 menit | 5 request / IP hash | `submission_attempts.kind = 'submit'` |

Migration `20261116100000_submission_attempt_kind.sql` menambahkan kolom
`kind` dan index `(ip_hash, kind, created_at desc)`.

---

## 4. Hasil verifikasi (aktual)

Perintah yang dijalankan:

```bash
npm run typecheck   # lulus
npm run lint        # lulus
npm run build       # lulus, 9 route
```

Smoke test dengan `next dev` + event placeholder published sementara:

| Cek | Hasil |
|-----|-------|
| `GET /` | `200`, 5 event demo tampil |
| `GET /guestlist` | `404` — pintu publik ditutup |
| `GET /guestlist/<token valid>` | `200`, form tampil dengan event terkunci ke link |
| `GET /guestlist/<token tidak dikenal>` | `404` |
| `GET /guestlist/<bukan-uuid>` | `404` |
| `GET /privacy` | `200` |
| `GET /does-not-exist` | `404` + brand 404 page |
| `GET /robots.txt` | Disallow `/admin`, `/api` |
| `GET /sitemap.xml` | 3 URL publik |
| Security headers | `nosniff`, `DENY`, `strict-origin-when-cross-origin`, `Permissions-Policy` aktif |
| `POST /api/guestlist/upload-url` body invalid | `400 validation_error` + field errors |
| `POST /api/guestlist` body invalid | `400 validation_error` + field errors |
| Body > 16 KB | `400` |
| `POST` valid shape tanpa secret asli | `503 service_unavailable` (fail closed) |

Catatan: event placeholder sudah di-`unpublish` kembali setelah smoke test agar
tidak tampil sebagai event nyata. Untuk melihat card lagi:

```sql
update public.events
set is_published = true
where slug = 'placeholder-loud-jakarta-001';
```

Kembalikan ke kondisi aman:

```sql
update public.events
set is_published = false
where slug = 'placeholder-loud-jakarta-001';
```

---

## 5. Yang masih diblokir

**End-to-end submit belum diuji** karena `.env.local` masih berisi
`SUPABASE_SECRET_KEY=sb_secret_your_key_here`. Tanpa secret asli:

- `enforceRateLimit()` tidak bisa menulis ke `submission_attempts`;
- signed upload URL tidak bisa dibuat;
- insert guestlist tidak bisa dilakukan.

Setelah secret asli diisi dan dev server direstart, uji:

1. Login admin, buka `/admin/events`, klik **Copy guestlist link** pada event
   yang `registration_open`.
2. Buka link `/guestlist/<token>` tersebut.
3. Isi nama, Instagram, PR.
3. Upload dua gambar JPG/PNG/WEBP.
4. Submit → harus muncul status `PENDING`.
5. Cek database:
   ```sql
   select id, full_name, instagram, status, story_proof_path, comment_proof_path
   from public.guestlist
   order by created_at desc
   limit 1;
   ```
6. Submit ulang Instagram yang sama → `409 duplicate_instagram`.
7. Buka file path di browser tanpa signed URL → harus ditolak.
8. Sebagai `anon`, `select * from public.guestlist` → permission denied.

---

## 6. Placeholder yang disengaja

| Item | Kondisi saat ini |
|------|------------------|
| Logo | Wordmark teks `LOUD JAKARTA` |
| Flyer | Placeholder generatif CSS (label `FLYER TBA`) |
| Instagram | `NEXT_PUBLIC_INSTAGRAM_URL` kosong → state "coming soon", bukan link palsu |
| WhatsApp default | `NEXT_PUBLIC_DEFAULT_WHATSAPP_NUMBER` kosong → RSVP disabled informatif |
| Nomor WA event | Null pada seed → fallback ke env, lalu disabled |
| Turnstile | Site key + secret kosong → widget tidak dirender |
| CSP | Belum diaktifkan; dijadwalkan PHASE 5 |
| OG image | Belum ada; metadata title/description sudah ada |

Jangan mengisi nilai-nilai ini dengan data karangan. Isi setelah owner
memberikan data asli.

---

## 7. Environment tambahan

```env
NEXT_PUBLIC_INSTAGRAM_URL=
```

Public. Kosongkan sampai akun resmi tersedia. Jika diisi, nav dan footer
otomatis memakai link tersebut.

Turnstile: isi **keduanya** atau **kosongkan keduanya**.
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` tanpa `TURNSTILE_SECRET_KEY` akan membuat
submission gagal karena server tidak bisa memverifikasi.

---

## 8. File baru/changed utama

```text
src/app/(site)/layout.tsx
src/app/(site)/page.tsx
src/app/(site)/guestlist/page.tsx
src/app/(site)/privacy/page.tsx
src/app/api/guestlist/route.ts
src/app/api/guestlist/upload-url/route.ts
src/app/not-found.tsx
src/app/sitemap.ts
src/app/robots.ts
src/app/icon.svg
src/components/public/*
src/components/ui/button.tsx
src/components/ui/field.tsx
src/lib/api.ts
src/lib/data/events.ts
src/lib/format.ts
src/lib/images/compress.ts
src/lib/rate-limit.ts
src/lib/site.ts
src/lib/storage/constants.ts
src/lib/storage/proofs.ts
src/lib/turnstile.ts
src/lib/validation/guestlist.ts
src/lib/whatsapp.ts
src/lib/supabase/{browser,server,admin}.ts  # Database generic
scripts/cleanup-orphans.mjs
supabase/migrations/20261116100000_submission_attempt_kind.sql
src/app/(site)/guestlist/[token]/page.tsx
src/components/admin/copy-guestlist-link.tsx
supabase/migrations/20261117093000_guestlist_share_token.sql
supabase/migrations/20261117094500_guestlist_link_lookup.sql
src/components/public/gallery.tsx
src/lib/data/gallery.ts
src/lib/storage/constants.ts          # FLYER_BUCKET + GALLERY_BUCKET
supabase/migrations/20261117115000_gallery_photos.sql
```

---

## 9. Revisi — guestlist link-only

### Alur

1. Admin membuat event di `/admin/events/new` (event otomatis dapat token).
2. Admin membuka `/admin/events`, klik **Copy guestlist link**, lalu mengirim
   `https://<site>/guestlist/<token>` ke tamu yang diundang.
3. Tamu membuka link → form langsung terkunci ke event tersebut (tidak ada
   pemilih event).
4. Submit tetap lewat validasi server: `eventId` + `guestlistToken` harus
   cocok dan event harus published, belum archived, `registration_open`, dan
   tanggalnya belum lewat.
5. Admin mereview di `/admin/guestlist` seperti biasa.

### Keamanan token

- Kolom `public.events.guestlist_token uuid not null unique default
  gen_random_uuid()`.
- `anon` **tidak** punya akses ke kolom token. Grant `select` tabel-level
  dicabut dan diganti daftar kolom publik tanpa `guestlist_token`.
- Halaman link memakai RPC `public.get_guestlist_event_link(link_token uuid)`
  (`SECURITY DEFINER`). Fungsi hanya mengembalikan field publik untuk token
  yang persis cocok dan tidak pernah mengembalikan token itu sendiri.
- `/guestlist` selalu `404`, `robots.txt` men-disallow `/guestlist`, halaman
  token memakai `robots: noindex, nofollow`, dan entri sitemap dihapus.
- Link bisa dicabut kapan saja dengan merotasi token:

  ```sql
  update public.events
  set guestlist_token = gen_random_uuid()
  where id = '<event-id>';
  ```

  Setelah rotasi, link lama langsung `404`.

### Catatan

- Guestlist hanya bisa diisi selama link valid. Menutup
  `registration_open` atau meng-archive event mematikan link tanpa perlu
  rotasi token.
- Nomor WhatsApp event tetap dipakai untuk tombol RSVP publik; guestlist
  tidak lagi ditautkan dari homepage, header, footer, atau event card.

---

## 10. Gallery homepage

Gallery adalah section foto publik di bawah event grid. Tidak ada halaman
terpisah dan tidak ada form upload untuk pengunjung — foto hanya bisa
ditambahkan admin dari `/admin/gallery`.

### Perilaku publik

- `GET /#gallery` menampilkan maksimal 12 foto terbaru, urut `created_at
  desc`, grid 2 kolom di mobile dan 3 kolom di desktop dengan frame **16:9**
  (`object-cover`, jadi foto potret tetap rapi tanpa distorsi).
- Caption opsional tampil sebagai overlay di bagian bawah foto.
- Section **tidak dirender sama sekali** jika belum ada foto, jadi homepage
  tetap bersih sebelum owner mengunggah foto asli.
- Navigasi header dan footer punya anchor **Gallery** yang mengarah ke
  `/#gallery`.
- Jika query gallery gagal, homepage tetap tampil tanpa gallery (error hanya
  dicatat di server).

### Data dan keamanan

- Metadata di `public.gallery_photos` (`storage_path`, `caption`,
  `created_by`, `created_at`); file di bucket publik `gallery-photos`.
- Upload admin dipotong paksa **16:9 dari tengah** di browser sebelum
  dikompres ke WebP dan diunggah, jadi file yang tersimpan sudah 16:9 (bukan
  hanya crop tampilan).
- `anon` hanya bisa `SELECT` metadata dan membaca object publik.
- Insert/delete metadata dibatasi RLS `private.is_admin()`; policy Storage
  juga mensyaratkan role `authenticated` + `private.is_admin()`.
- `storage_path` wajib UUID + ekstensi `webp|jpg|jpeg|png`, sehingga file di
  bucket tidak bisa ditimpa nama bebas atau dipakai untuk path traversal.
- Upload dari browser memakai sesi admin (bukan service role), jadi tidak
  bergantung pada `SUPABASE_SECRET_KEY`.
