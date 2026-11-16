# PHASE 3 — PUBLIC WEBSITE

Status: **implemented locally, build passing, end-to-end guestlist submission
pending a real `SUPABASE_SECRET_KEY`.**
Tanggal: 16 November 2026

Dokumen acuan: `docs/PHASE-1-PLANNING.md` §3, §4.3, §6, §7 dan
`LOUD_JAKARTA_Master_Prompt.md` §4–5.

---

## 1. Scope yang selesai

| Area | Status | File utama |
|------|--------|------------|
| Homepage (header, hero, event grid, guestlist CTA, footer) | Selesai | `src/app/(site)/page.tsx`, `src/components/public/*` |
| Event cards dari database + flyer/placeholder | Selesai | `src/components/public/event-card.tsx`, `src/lib/data/events.ts` |
| WhatsApp RSVP per event + fallback env + disabled state | Selesai | `src/lib/whatsapp.ts` |
| Guestlist page + event selection | Selesai | `src/app/(site)/guestlist/page.tsx` |
| Guestlist form 5 field + 2 upload | Selesai | `src/components/public/guestlist-form.tsx` |
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
| `/guestlist` | RSC + client form | Hanya event `registration_open` |
| `/privacy` | Static RSC | Privacy notice |
| `/api/guestlist/upload-url` | POST | Signed upload URL per slot |
| `/api/guestlist` | POST | Validasi final + insert `pending` |
| `/sitemap.xml`, `/robots.txt` | Metadata route | `/admin` dan `/api` disallow |
| `/icon.svg` | Static | Favicon placeholder |

Tidak ada halaman detail event pada MVP; semua informasi ada di card.

---

## 3. Alur guestlist (implementasi aktual)

```text
Browser                          Server                         Supabase
  │ 1. POST /api/guestlist/upload-url { eventId, slot, mime, size }
  │ ─────────────────────────────► │ cek event open
  │                                │ rate limit (10 / 10 menit / IP hash)
  │                                │ buat path + signed upload token
  │ 2. { path, token } ◄─────────── │
  │ 3. uploadToSignedUrl(path, token, blob) ─────────────────────► storage
  │ 4. POST /api/guestlist { fields, paths, submissionKey, turnstileToken }
  │ ─────────────────────────────► │ cek event open
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
| `GET /` | `200`, event placeholder + `31 DEC 2026 · 22:00 WIB` tampil dari DB |
| `GET /guestlist` | `200`, form + 5 field + 2 upload tampil |
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

1. Buka `/guestlist`, pilih event placeholder.
2. Isi nama, Instagram, PR.
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
```
