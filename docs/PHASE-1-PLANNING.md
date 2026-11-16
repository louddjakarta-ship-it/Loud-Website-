# PHASE 1 — PLANNING: LOUD JAKARTA

Status: **Draft untuk approval**
Tanggal: 16 November 2026
Dokumen acuan: `LOUD_JAKARTA_Master_Prompt.md`

Dokumen ini adalah hasil PHASE 1 (Planning). Tidak ada kode aplikasi yang dibuat
pada tahap ini. Implementasi dimulai di PHASE 2 setelah dokumen ini disetujui.

---

## 1. Ringkasan & Asumsi

Asumsi berikut dipakai sebagai default. Semua diberi label jelas agar mudah
diubah sebelum PHASE 2.

| # | Asumsi | Default | Dampak jika diubah |
|---|--------|---------|--------------------|
| A1 | Bahasa UI publik | **English** (sesuai contoh copy di master prompt) | Perlu revisi seluruh copy; struktur i18n belum dibuat di MVP |
| A2 | Model bisnis | Satu brand, satu tenant (LOUD JAKARTA) | Multi-tenant butuh kolom `tenant_id` + RLS tambahan |
| A3 | Tiket & pembayaran | **Tidak ada** di MVP | Menambah integrasi payment gateway + tabel orders |
| A4 | Notifikasi | Tidak ada email/WA otomatis | Butuh provider email/WA + queue + template |
| A5 | Login admin | Email + password via Supabase Auth | Magic link/OAuth butuh route callback tambahan |
| A6 | Registrasi admin | Tidak ada self-signup; admin dibuat manual oleh super_admin | Perlu alur undangan + verifikasi |
| A7 | Jumlah flyer per event | 1 flyer | Perlu tabel `event_media` |
| A8 | Halaman detail event | Tidak ada; semua info ada di card + flyer | Perlu route `/events/[slug]` |
| A9 | Event lampau | Tidak ditampilkan di homepage | Perlu section archive |
| A10 | Zona waktu | `Asia/Jakarta` untuk input & tampilan; disimpan `timestamptz` (UTC) | Perlu konversi ulang di semua formatter |
| A11 | Nomor WhatsApp | Placeholder; fallback informatif jika kosong | Tidak ada link palsu; tombol disabled + pesan |
| A12 | Data PR/reference | Text input bebas (bukan dropdown) | Dropdown butuh tabel `reference_people` |
| A13 | Staff role | Struktur disiapkan; UI manajemen staff belum dibangun di MVP | Butuh halaman `/admin/settings/team` |
| A14 | Anti-spam | Rate limit berbasis DB + Cloudflare Turnstile opsional | Tanpa Turnstile, risiko spam naik saat traffic tinggi |
| A15 | Email admin pertama | Placeholder, diisi owner saat setup | Tidak bisa bootstrap admin |
| A16 | Duplikat guestlist | **Blokir total**: 1 Instagram = 1 pendaftaran per event, termasuk setelah rejected | Partial unique / izinkan duplikat butuh perubahan index + alur admin |

**Prinsip kerja:** fitur yang belum diimplementasikan akan diberi label jelas
(`Belum tersedia` / `Segera hadir`), tidak menyamar sebagai fitur jadi.

---

## 2. Sitemap & Struktur Halaman

### 2.1 Public

| Route | Tipe | Isi | Auth |
|-------|------|-----|------|
| `/` | RSC | Navbar, hero, upcoming events, guestlist CTA, footer | Public |
| `/#events` | Anchor | Section upcoming events di homepage | Public |
| `/guestlist` | RSC + client form | Pilih event, form 5 field, 2 upload, privacy notice, success state | Public |
| `/privacy` | RSC (opsional, 1 halaman pendek) | Privacy notice lengkap untuk bukti guestlist | Public |
| `not-found` | RSC | 404 sesuai brand + link kembali | Public |
| `/robots.txt`, `/sitemap.xml` | Metadata route | SEO dasar | Public |

Catatan: `/privacy` hanya dibuat jika privacy notice inline di form dirasa
kurang. Default: notice singkat inline + halaman `/privacy` (murah, 1 file).

### 2.2 Admin

| Route | Tipe | Isi | Auth |
|-------|------|-----|------|
| `/admin/login` | Client form + server action | Login email/password | Public (redirect jika sudah login) |
| `/admin` | RSC | Statistik: total event, total pendaftar, pending, approved, rejected | Admin |
| `/admin/events` | RSC + client table | Daftar event, toggle publish/registration, aksi | Admin |
| `/admin/events/new` | RSC + client form | Buat event + upload flyer | Admin |
| `/admin/events/[id]/edit` | RSC + client form | Edit event, ganti flyer, arsip | Admin |
| `/admin/guestlist` | RSC + client table | Tabel, search, filter, sort, pagination, export | Admin |
| `/admin/guestlist/[id]` | RSC + client panel | Detail pendaftar, signed URL preview bukti, approve/reject, catatan | Admin |
| `/admin/unauthorized` | RSC | Akun login tapi bukan admin / nonaktif | Authenticated |

### 2.3 Route Handlers (API)

| Route | Method | Fungsi | Auth |
|-------|--------|--------|------|
| `/api/guestlist/upload-url` | POST | Validasi awal + terbitkan signed upload URL (2 slot) | Public + rate limit |
| `/api/guestlist` | POST | Validasi final, verifikasi file, insert submission `pending` | Public + rate limit + Turnstile (opsional) |
| `/api/admin/guestlist/export` | GET | CSV sesuai filter aktif | Admin (`super_admin` untuk MVP) |
| `/api/admin/guestlist/[id]/proof/[kind]` | GET | Redirect 302 ke signed URL 60 detik (`kind`: `story` \| `comment`) | Admin |

Mutasi admin lain (event CRUD, review status) memakai **Server Actions**,
bukan route handler, agar validasi + revalidasi cache konsisten.

### 2.4 Struktur folder (rencana)

```text
loud-jakarta/
├── public/
│   ├── images/            # placeholder editorial
│   ├── logo/              # placeholder wordmark
│   └── fonts/             # kosong sampai font brand tersedia
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── not-found.tsx
│   │   ├── privacy/page.tsx
│   │   ├── guestlist/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── unauthorized/page.tsx
│   │   │   ├── events/page.tsx
│   │   │   ├── events/new/page.tsx
│   │   │   ├── events/[id]/edit/page.tsx
│   │   │   └── guestlist/page.tsx
│   │   │       └── [id]/page.tsx
│   │   └── api/
│   │       ├── guestlist/route.ts
│   │       ├── guestlist/upload-url/route.ts
│   │       └── admin/guestlist/export/route.ts
│   │           └── [id]/proof/[kind]/route.ts
│   ├── components/
│   │   ├── public/        # header, hero, event card, footer, form
│   │   ├── admin/         # shell, table, filter, review panel, event form
│   │   └── ui/            # button, input, dialog, badge, toast, dll.
│   ├── lib/
│   │   ├── supabase/      # browser.ts, server.ts, admin.ts
│   │   ├── auth/          # require-admin.ts
│   │   ├── validation/    # zod schemas
│   │   ├── storage/       # path, signed url, cleanup
│   │   ├── whatsapp.ts
│   │   ├── rate-limit.ts
│   │   ├── csv.ts
│   │   └── format.ts      # tanggal Asia/Jakarta, slug, dll.
│   ├── actions/           # server actions admin
│   ├── types/
│   ├── proxy.ts
│   └── styles/globals.css
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── docs/
├── .env.example
├── README.md
└── package.json
```

---

## 3. User Flow

### 3.1 Pengunjung — melihat event & RSVP

```text
Buka /
  └─ Hero + daftar event published & registration_open
       ├─ Klik flyer/card → (tidak ada detail page) informasi di card
       └─ Klik "RSVP via WhatsApp"
            ├─ Nomor valid → buka wa.me/<nomor>?text=<pesan ter-encode>
            └─ Nomor kosong → tombol disabled + "RSVP contact coming soon"
```

Aturan:
- Event diurutkan `event_date ASC`, hanya `is_published = true`,
  `archived_at IS NULL`, dan `event_date >= now()`.
- Nomor diambil dari `events.whatsapp_number`, fallback ke
  `NEXT_PUBLIC_DEFAULT_WHATSAPP_NUMBER` (env), lalu fallback UI informatif.
- Normalisasi nomor ke digit E.164 tanpa `+` sebelum membentuk URL.
- Pesan: `Hi LOUD JAKARTA! I would like to RSVP for [EVENT NAME]. Please provide me with more information.`

### 3.2 Pengunjung — guestlist

```text
Buka /guestlist
  └─ Ambil event published + registration_open + belum lewat
       ├─ Kosong → empty state "No guestlist open right now"
       └─ Pilih event (default: event terdekat)
            └─ Isi form:
                 full_name, instagram, reference_person
                 story_proof (file), comment_proof (file)
                 ├─ Client: validasi tipe/ukuran, kompres, preview, progress
                 ├─ Server: validasi field, event masih open, rate limit,
                 │          verifikasi file di storage, cek duplikat
                 └─ Sukses → panel konfirmasi:
                      "Submission received. Status: PENDING.
                       Admin will verify your proof. You are NOT on the
                       guestlist until approved."
```

Edge case yang ditangani:

| Kasus | Perilaku |
|-------|----------|
| Tidak ada event open | Empty state + link Instagram |
| Event ditutup saat form terbuka | Submit ditolak, pesan "Registration for this event has closed" |
| File > batas / tipe salah | Error per-field, file tidak diunggah |
| Upload gagal di tengah | Retry per slot, tidak perlu isi ulang form |
| Instagram sudah terdaftar (pending/approved/rejected) | 409 + pesan generik; tidak membocorkan data pendaftar |
| Double click / retry jaringan | `submission_key` idempotent + tombol disabled |
| Rate limit | 429 + pesan "Too many attempts, try again later" |
| Turnstile gagal | 400 + pesan generik, tanpa detail internal |

### 3.3 Admin — login & operasional

```text
Buka /admin/*
  ├─ Belum login → redirect /admin/login?next=<path>
  ├─ Login sukses tapi tidak ada di admin_profiles → /admin/unauthorized
  └─ Login sukses & aktif → /admin
       ├─ Dashboard: 5 stat cards
       ├─ Events:
       │    ├─ Create/Edit: name, slug, date, venue, WA, flyer,
       │    │                registration_open, is_published
       │    ├─ Upload flyer → bucket event-flyers (public)
       │    ├─ Toggle publish / registration
       │    └─ Archive (soft delete) / hard delete dengan konfirmasi
       └─ Guestlist:
            ├─ Search nama/Instagram, filter event/status,
            │  sort created_at, pagination
            ├─ Detail → preview story & comment proof (signed URL 60s)
            ├─ Approve / Reject → dialog konfirmasi + catatan opsional
            │    └─ simpan reviewed_by, reviewed_at
            └─ Export CSV sesuai filter aktif
```

### 3.4 Status pendaftaran

```text
pending ──approve──> approved
   └─────reject───> rejected (final; tidak bisa submit ulang)
```

Tidak ada transisi `approved → rejected` di UI MVP (bisa dilakukan manual via
DB oleh super_admin jika benar-benar perlu; didokumentasikan).

---

## 4. Arsitektur Teknis

### 4.1 Stack & versi

- Next.js (App Router, versi stabil terbaru saat setup) + TypeScript strict
- Tailwind CSS v4 (mengikuti default `create-next-app`)
- Supabase: Postgres, Storage, Auth (`@supabase/supabase-js`, `@supabase/ssr`)
- Zod untuk validasi skema (client + server, schema dibagi)
- Vercel untuk hosting, GitHub untuk version control
- Tidak memakai UI kit SaaS generik; komponen ditulis sendiri

### 4.2 Pemisahan Supabase client

| File | Key | Dipakai di | Aturan |
|------|-----|-----------|--------|
| `lib/supabase/browser.ts` | publishable/anon | Client Components | Hanya untuk auth session & signed upload |
| `lib/supabase/server.ts` | publishable/anon + cookies | RSC, Server Actions, Route Handlers | Baca data publik & sesi admin |
| `lib/supabase/admin.ts` | `SUPABASE_SECRET_KEY` | Server-only | `import 'server-only'`; bypass RLS; hanya untuk operasi tervalidasi |

Aturan keras: `SUPABASE_SECRET_KEY` tidak pernah masuk `NEXT_PUBLIC_*`, tidak
pernah di-import dari Client Component, tidak pernah dikirim ke response.

### 4.3 Alur upload bukti (keputusan penting)

Vercel Serverless membatasi body request ~4.5 MB. Dua gambar @5 MB tidak bisa
dilewatkan ke route handler. Solusi: **direct-to-storage signed upload**.

```text
Client                         Server                        Supabase Storage
  │ 1. POST /api/guestlist/upload-url                         │
  │    { eventId, slot, mime, size } ─────────►               │
  │                              │ cek event open + rate limit │
  │                              │ buat signed upload URL ────►│
  │ 2. { path, token } ◄─────────│                             │
  │ 3. uploadToSignedUrl(path, token, file) ──────────────────►│
  │ 4. POST /api/guestlist { fields, paths, submissionKey } ──►│
  │                              │ validasi field + path       │
  │                              │ download & cek magic bytes  │
  │                              │ cek size/mime               │
  │                              │ insert row (service role)   │
  │                              │ gagal → hapus 2 file        │
  │ 5. { id, status: "pending" } ◄│                            │
```

Detail:
- Path diacak: `guestlist-proofs/{event_id}/{uuid}.{ext}`. Client tidak memilih
  nama file; server yang menentukan.
- Bucket `guestlist-proofs` dibatasi `allowed_mime_types` + `file_size_limit`.
- Kompresi client-side (canvas → WebP, sisi terpanjang maks 1600 px, kualitas
  0.82) agar upload cepat dan hemat storage. File asli tidak dikirim.
- Server memverifikasi magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`,
  WebP `RIFF....WEBP`) setelah upload; file invalid dihapus.
- File orphan (upload sukses, insert gagal) dihapus langsung; sisa upload
  terbengkalai dibersihkan oleh script `scripts/cleanup-orphans.ts`
  (dijalankan manual atau Vercel Cron, dokumentasi disertakan).

Alternatif yang ditolak: mengirim 2 file via FormData ke route handler (limit
Vercel) dan base64 di JSON (membengkak 33%).

### 4.4 Flyer event

- Upload oleh admin via Server Action → service role → bucket `event-flyers`
  (public read).
- Path: `event-flyers/{event_id}/{uuid}.webp`.
- DB menyimpan `flyer_path`, bukan URL permanen. URL publik dibentuk dengan
  `getPublicUrl()` saat render.
- Flyer lama dihapus setelah event tersimpan dengan flyer baru (hindari orphan).

### 4.5 Format & timezone

- `event_date` disimpan `timestamptz` (UTC).
- Input admin `datetime-local` ditafsirkan sebagai `Asia/Jakarta`, dikonversi
  ke UTC di server.
- Tampilan publik memakai `Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', ... })`,
  contoh `SAT, 21 NOV 2026 · 22:00 WIB`.
- Slug dibuat dari nama event, lowercase, `[a-z0-9-]`, dipastikan unik
  (suffix `-2`, `-3` jika bentrok).

### 4.6 Penanganan error

- Semua error yang tampil ke user bersifat generik + actionable.
- Error internal di-log server-side dengan `requestId`, tanpa isi bukti / PII.
- Bentuk response API konsisten:
  `{ ok: false, error: { code, message, fields? } }`.
- Server Actions mengembalikan state terstruktur (`{ status, message, fieldErrors }`),
  bukan melempar error mentah ke UI.

### 4.7 Cache & rendering

- Homepage: RSC, revalidate `60` detik atau `revalidateTag('events')` setelah
  mutasi admin.
- Admin pages: dynamic, `no-store`.
- Guestlist page: RSC untuk daftar event, client component untuk form.
- `next/image` untuk flyer dengan `remotePatterns` ke host Supabase.

---

## 5. Database

### 5.1 ERD

```text
auth.users (Supabase)
   │ 1:1
   ▼
admin_profiles ──1:N──> events.created_by
   │ 1:N
   ▼
guestlist.reviewed_by

events ──1:N──> guestlist
```

### 5.2 Tabel & kolom

#### `admin_profiles`
| Kolom | Tipe | Aturan |
|-------|------|--------|
| `id` | uuid | PK, FK → `auth.users(id)` `ON DELETE CASCADE` |
| `display_name` | text | nullable, maks 80 |
| `role` | `admin_role` | not null default `staff` |
| `is_active` | boolean | not null default true |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | default now(), trigger |

#### `events`
| Kolom | Tipe | Aturan |
|-------|------|--------|
| `id` | uuid | PK default `gen_random_uuid()` |
| `name` | text | not null, 1–140 char |
| `slug` | text | not null unique, format `^[a-z0-9]+(-[a-z0-9]+)*$` |
| `description` | text | nullable, maks 2000 |
| `flyer_path` | text | nullable |
| `event_date` | timestamptz | not null |
| `venue` | text | nullable, maks 160 |
| `whatsapp_number` | text | nullable, `^[1-9][0-9]{7,14}$` |
| `registration_open` | boolean | not null default true |
| `is_published` | boolean | not null default false |
| `archived_at` | timestamptz | nullable (soft delete) |
| `created_by` | uuid | FK → `admin_profiles(id)` `ON DELETE SET NULL` |
| `created_at` / `updated_at` | timestamptz | default now(), trigger |

#### `guestlist`
| Kolom | Tipe | Aturan |
|-------|------|--------|
| `id` | uuid | PK default `gen_random_uuid()` |
| `submission_key` | uuid | not null unique (idempotency) |
| `event_id` | uuid | not null FK → `events(id)` `ON DELETE RESTRICT` |
| `full_name` | text | not null, 2–120 char |
| `instagram` | text | not null, lowercase tanpa `@`, `^[a-z0-9._]{1,30}$` |
| `story_proof_path` | text | not null |
| `comment_proof_path` | text | not null |
| `reference_person` | text | not null, 1–120 char |
| `status` | `guestlist_status` | not null default `pending` |
| `admin_note` | text | nullable, maks 1000 |
| `reviewed_by` | uuid | nullable FK → `admin_profiles(id)` `ON DELETE SET NULL` |
| `reviewed_at` | timestamptz | nullable |
| `created_at` | timestamptz | default now() |

Constraint konsistensi review:

```sql
CHECK (
  (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
  OR
  (status <> 'pending' AND reviewed_at IS NOT NULL)
)
```

#### `submission_attempts` (rate limit)
| Kolom | Tipe | Aturan |
|-------|------|--------|
| `id` | bigserial | PK |
| `ip_hash` | text | not null (SHA-256 IP + salt, bukan IP mentah) |
| `event_id` | uuid | nullable FK → events, `ON DELETE CASCADE` |
| `created_at` | timestamptz | default now() |

Index `(ip_hash, created_at DESC)`. Baris > 24 jam dihapus berkala.

### 5.3 Kebijakan duplikat guestlist

**Keputusan final:** satu Instagram hanya boleh mendaftar **sekali** per event,
tanpa memandang status (termasuk `rejected`).

```sql
CREATE UNIQUE INDEX guestlist_unique_instagram_per_event
  ON public.guestlist (event_id, instagram);
```

Konsekuensi:
- Pendaftar yang di-reject **tidak bisa** submit ulang lewat form; harus
  menghubungi admin/WhatsApp untuk penanganan manual.
- Admin dapat mengakomodasi kasus khusus dengan menghapus baris lama
  (`super_admin` saja) atau mengubah data lama, lalu meminta pendaftar submit
  ulang. Prosedur ini didokumentasikan di `docs/ADMIN_SETUP.md`.
- Data historis tetap utuh kecuali admin sengaja menghapus.
- Respons 409 memakai pesan generik
  `"This Instagram is already registered for this event."` — tidak
  membocorkan status atau data pendaftar.
- `submission_key` tetap dipakai untuk mencegah double submission akibat retry
  jaringan/double click (idempotent), terpisah dari aturan duplikat di atas.

### 5.4 Index tambahan

```sql
CREATE INDEX events_public_listing_idx
  ON public.events (event_date)
  WHERE is_published AND archived_at IS NULL;

CREATE INDEX guestlist_event_created_idx
  ON public.guestlist (event_id, created_at DESC);

CREATE INDEX guestlist_status_created_idx
  ON public.guestlist (status, created_at DESC);

CREATE INDEX guestlist_instagram_idx
  ON public.guestlist (instagram);
```

### 5.5 Trigger `updated_at`

Satu function `public.set_updated_at()` + trigger pada `events` dan
`admin_profiles`.

### 5.6 Seed

`supabase/seed.sql` berisi:
- 1 event contoh **unpublished** (agar tidak muncul di production tanpa izin).
- Tidak ada data guestlist palsu.
- Admin tidak di-seed (dibuat manual, lihat §6.8).

---

## 6. Keamanan

### 6.1 Ringkasan ancaman → kontrol

| Aset / ancaman | Kontrol |
|----------------|---------|
| Bukti guestlist bocor ke publik | Bucket private, tanpa policy select untuk anon, signed URL 60 detik |
| Service role key bocor ke browser | Hanya `lib/supabase/admin.ts` + `server-only`; dilarang `NEXT_PUBLIC_*` |
| Spam submission | Rate limit per IP hash + unique aktif per event + Turnstile opsional |
| File berbahaya / spoofed MIME | Whitelist MIME, batas ukuran bucket, magic-byte check, nama file acak |
| Path traversal | Path dibuat server (UUID), tidak menerima path dari client |
| IDOR bukti antar admin | Signed URL diterbitkan hanya setelah cek role di server |
| Akses admin tanpa hak | `requireAdmin()` di layout + setiap Server Action/route admin |
| Kebocoran PII di log/error | Log tanpa isi bukti/nama/IG; pesan user generik |
| CSV injection | Escape formula (`= + - @`) dengan prefix `'` |
| XSS | React escaping, tanpa `dangerouslySetInnerHTML`, CSP |
| Clickjacking | `frame-ancestors 'none'` |

### 6.2 RLS matrix

| Tabel | anon | authenticated (non-admin) | staff | super_admin | service role |
|-------|------|---------------------------|-------|-------------|--------------|
| `events` SELECT | published & not archived | published & not archived | semua | semua | semua |
| `events` INSERT/UPDATE/DELETE | ✗ | ✗ | ✓ (kecuali hard delete) | ✓ | ✓ |
| `guestlist` SELECT | ✗ | ✗ | ✓ | ✓ | ✓ |
| `guestlist` INSERT | ✗ | ✗ | ✗ (via server) | ✗ (via server) | ✓ |
| `guestlist` UPDATE | ✗ | ✗ | ✓ | ✓ | ✓ |
| `guestlist` DELETE | ✗ | ✗ | ✗ | ✓ | ✓ |
| `admin_profiles` SELECT | ✗ | hanya baris sendiri | sendiri | semua | semua |
| `admin_profiles` INSERT/UPDATE/DELETE | ✗ | ✗ | ✗ | ✓ | ✓ |
| `submission_attempts` | ✗ | ✗ | ✗ | ✗ | ✓ |

Helper `SECURITY DEFINER` (dimiliki `postgres`, `search_path` dikunci):

```sql
public.is_admin()       -- admin_profiles aktif untuk auth.uid()
public.is_super_admin() -- role = super_admin dan aktif
```

Catatan: penulisan guestlist dari publik **selalu** lewat route handler dengan
service role setelah validasi; tidak ada policy insert publik sama sekali.

### 6.3 Storage policies

| Bucket | Public read | Insert | Update/Delete |
|--------|-------------|--------|----------------|
| `event-flyers` | ✓ (hanya flyer event published yang ditampilkan di UI) | service role | service role |
| `guestlist-proofs` | ✗ | signed upload URL (server-issued) | service role |

- `guestlist-proofs`: tidak ada policy SELECT untuk anon. Policy SELECT admin
  ditambahkan sebagai defense-in-depth, tetapi preview tetap lewat signed URL.
- Signed URL TTL: 60 detik, dibuat saat admin mengklik preview.
- Tidak menyimpan signed URL di DB.

### 6.4 Validasi input

| Field | Aturan |
|-------|--------|
| `full_name` | trim, 2–120 char, tanpa karakter kontrol |
| `instagram` | trim, hapus `@` di depan, lowercase, `^[a-z0-9._]{1,30}$` |
| `reference_person` | trim, 1–120 char |
| `event_id` | UUID valid + event published + `registration_open` + belum lewat |
| `story_proof_path` / `comment_proof_path` | harus diawali `{event_id}/` milik event tsb, ekstensi whitelist |
| File | JPG/JPEG/PNG/WEBP, ≤5 MB (configurable), magic bytes valid, dimensi wajar |
| `submission_key` | UUID v4 dari client, unik |
| `admin_note` | ≤1000 char |
| Event fields | name/slug/date/venue/WA sesuai constraint DB |

Semua divalidasi ulang di server dengan Zod; validasi client hanya untuk UX.

### 6.5 Rate limiting

- `POST /api/guestlist/upload-url` dan `POST /api/guestlist`:
  - maks **10 permintaan / 10 menit / IP hash** (configurable),
  - maks **5 submission sukses / jam / IP hash**.
- IP di-hash `SHA-256(ip + RATE_LIMIT_SALT)`; IP mentah tidak disimpan.
- Header `x-forwarded-for` dibaca hanya di server.
- Jika `TURNSTILE_SECRET_KEY` diset, token Turnstile diverifikasi server-side
  sebelum upload URL diterbitkan.
- Response 429 dengan `Retry-After`.

### 6.6 Security headers

Diterapkan via `next.config.ts` + proxy (CSP nonce):
- `Content-Security-Policy` (default-src 'self'; img-src self + Supabase + data/blob;
  connect-src self + Supabase; frame-ancestors 'none'; form-action 'self')
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- HSTS ditangani Vercel.
- CSP diterapkan sebagai Report-Only selama development, enforce sebelum launch.

### 6.7 Proteksi route admin

1. `proxy.ts` me-refresh sesi Supabase dan redirect ke `/admin/login` bila
   tidak ada sesi untuk path `/admin/*` (kecuali `/admin/login`).
2. `src/app/admin/layout.tsx` memanggil `requireAdmin()` → query
   `admin_profiles` dengan server client; jika tidak ada/`is_active=false` →
   `/admin/unauthorized`.
3. Setiap Server Action & route admin memanggil `requireAdmin()` /
   `requireSuperAdmin()` sendiri (jangan bergantung pada layout).
4. RLS menjadi lapisan terakhir di database.

### 6.8 Bootstrap admin pertama (aman)

1. Owner membuat user di Supabase Dashboard → Authentication → Users
   (email + password kuat, email auto-confirm).
2. Jalankan SQL (service role / SQL editor):
   ```sql
   INSERT INTO public.admin_profiles (id, display_name, role)
   VALUES ('<auth-user-uuid>', 'Owner', 'super_admin');
   ```
3. Login di `/admin/login`.
4. Tidak ada endpoint publik untuk membuat admin.
5. Dokumentasi lengkap di `docs/ADMIN_SETUP.md`.

### 6.9 Privasi

- Bukti hanya dipakai untuk verifikasi guestlist (dinyatakan di form).
- Tidak ada tracking analytics pihak ketiga di MVP.
- Tidak menampilkan data pendaftar lain.
- Kebijakan retensi: bukti disimpan sampai 90 hari setelah event, lalu dapat
  dihapus manual/script (dokumentasi; otomatisasi opsional).

---

## 7. Design System LOUD JAKARTA

### 7.1 Prinsip

Dark editorial / underground, premium, bukan template SaaS. Flyer adalah
bintang utama. Ruang kosong disengaja. Accent dipakai hemat (≤5% area).
Animasi halus, tidak mengganggu.

### 7.2 Token warna (placeholder, mudah diganti)

| Token | Nilai | Pemakaian |
|-------|-------|-----------|
| `--ink` | `#050505` | background utama |
| `--surface` | `#0B0B0B` | card / panel |
| `--line` | `#1F1F1F` | border halus |
| `--muted` | `#8A8A8A` | teks sekunder |
| `--paper` | `#F2F2ED` | teks utama (putih hangat) |
| `--accent` | `#C6FF00` | CTA, focus ring, highlight (electric lime) |
| `--danger` | `#FF4D3D` | error / rejected |
| `--success` | `#7CFFB2` | approved |

Kontras: paper/ink ≈ 18:1, muted/ink ≈ 6.4:1, accent/ink ≈ 17:1, teks hitam
di atas accent ≈ 17:1. Semua lolos WCAG AA.

### 7.3 Tipografi

- Display: **Anton** (condensed, uppercase) — placeholder, diganti jika font
  brand tersedia. Dimuat via `next/font/google`, `display: swap`.
- Body/UI: **Inter** (variable).
- Metadata/label: `ui-monospace` system stack, uppercase, tracking `0.12em`.
- Skala (clamp, fluid):
  - `display-xl`: `clamp(4rem, 14vw, 13rem)` / leading `0.85` / tracking `-0.02em`
  - `display-lg`: `clamp(3rem, 9vw, 8rem)`
  - `h1`: `clamp(2.5rem, 6vw, 5rem)`
  - `h2`: `clamp(1.75rem, 4vw, 3rem)`
  - `body`: `1rem / 1.6`
  - `small`: `0.875rem`
  - `micro`: `0.75rem` uppercase tracking lebar

### 7.4 Layout & grid

- Container `max-width: 1440px`, gutter `clamp(20px, 5vw, 72px)`.
- 12 kolom desktop, 4 kolom mobile, gap 24 px.
- Hero asimetris (7/5 atau 8/4), headline oversized, flyer overlap ringan.
- Event grid: 1 kolom mobile, 2 kolom tablet, 3 kolom desktop.
- Flyer frame rasio **4:5**, `object-cover`, border tipis `--line`.
- Section spacing `clamp(80px, 12vw, 160px)`.
- Nomor section / label editorial (`01 — UPCOMING`) untuk nuansa katalog.

### 7.5 Komponen

**UI dasar:** `Button` (accent / outline / ghost / danger), `Input`, `Textarea`,
`Label`, `FieldError`, `Select`, `Badge`, `Dialog`, `Toast`, `Spinner`,
`Skeleton`, `Pagination`, `Alert`, `EmptyState`.

**Public:** `SiteHeader` (sticky, transparan → solid saat scroll), `MobileNav`
(full-screen overlay), `Hero`, `EventGrid`, `EventCard` (flyer dominan, tanggal,
venue, RSVP), `RsvpButton`, `GuestlistForm`, `ImageDropzone` (drag & drop,
kamera/galeri di mobile), `ImagePreview`, `PrivacyNotice`, `SuccessPanel`,
`SiteFooter`.

**Admin:** `AdminShell` (sidebar + topbar), `StatCard`, `DataTable`,
`FilterBar`, `StatusBadge`, `ConfirmDialog`, `ProofViewer`, `ReviewPanel`,
`EventForm`, `FlyerUploader`, `AdminEmptyState`.

### 7.6 Motion

- Durasi 180–320 ms, easing `cubic-bezier(0.22, 1, 0.36, 1)`.
- Hover: border/underline/translate 2 px, bukan scale berlebihan.
- Reveal on scroll halus via IntersectionObserver (sekali saja).
- `prefers-reduced-motion: reduce` → semua transisi/animasi dimatikan.
- Tidak ada parallax, marquee cepat, atau flash.

### 7.7 Accessibility

- Semantic HTML (`header`, `nav`, `main`, `section`, `footer`, `table`).
- Skip link "Skip to content".
- Semua input punya `<label>`; error terhubung `aria-describedby`.
- `aria-live="polite"` untuk status upload & hasil submit.
- Focus ring 2 px accent + offset 2 px, terlihat di semua elemen interaktif.
- Target sentuh minimal 44×44 px.
- Alt flyer: `Flyer for {event name}`.
- Dialog: focus trap, `Esc` menutup, `aria-modal`.
- Tidak ada teks di dalam gambar yang menjadi satu-satunya sumber info.

### 7.8 SEO & metadata

- Title template `%s — LOUD JAKARTA`, description per halaman.
- Open Graph + Twitter card; OG image placeholder sampai flyer tersedia.
- `sitemap.ts` (hanya halaman publik), `robots.ts` (disallow `/admin`, `/api`).
- Favicon placeholder (wordmark "L").
- `lang="en"` (menyesuaikan asumsi A1).

### 7.9 Placeholder aset

- Logo: wordmark teks "LOUD JAKARTA" (font display), bukan gambar.
- Flyer: pola grafik generatif CSS/SVG bertanda `PLACEHOLDER` (tidak meniru
  poster siapa pun).
- Hero image: tekstur noise/gradient monokrom, bukan foto berhak cipta.
- Semua placeholder didokumentasikan di `docs/CONFIGURATION_TODO.md`.

---

## 8. Rencana Implementasi (PHASE 2–6)

### PHASE 2 — Project Setup

Deliverable:
- Project Next.js + TypeScript + Tailwind berjalan lokal.
- Struktur folder sesuai §2.4 (tanpa folder kosong).
- Supabase client browser/server/admin + `proxy.ts`.
- `.env.example`, `README.md` awal, `docs/` awal.
- Halaman sementara `/` yang membuktikan font & token berjalan.

File utama: `package.json`, `next.config.ts`, `tsconfig.json`,
`src/app/layout.tsx`, `src/app/page.tsx`, `src/styles/globals.css`,
`src/lib/supabase/*`, `src/proxy.ts`, `.env.example`.

Prasyarat lingkungan: **Node.js 24.20.0** terpasang (winget, user scope),
npm 11.19.0, Git 2.56.1. Lihat `docs/PHASE-2-SETUP.md` untuk hasil verifikasi.

Checkpoint: `npm run dev` + `npm run build` sukses, halaman sementara tampil.

### PHASE 3 — Public Website

Deliverable:
- Migration SQL + seed + RLS + Storage policies (`supabase/migrations/*`).
- Homepage lengkap (navbar, hero, event grid, CTA, footer, empty state).
- RSVP WhatsApp berfungsi (event number → env fallback → disabled state).
- `/guestlist`: pilih event, form, kompresi + preview + upload 2 bukti,
  submit `pending`, success panel, semua edge case §3.2.
- `/privacy`, 404, metadata, OG, favicon.

File utama: `supabase/migrations/0001_init.sql`, `src/app/page.tsx`,
`src/app/guestlist/page.tsx`, `src/components/public/*`,
`src/app/api/guestlist/*`, `src/lib/validation/guestlist.ts`,
`src/lib/storage/*`, `src/lib/whatsapp.ts`.

Checkpoint: submit guestlist nyata tersimpan `pending`; anon tidak bisa membaca
tabel/bucket; RSVP membuka WA dengan pesan benar.

### PHASE 4 — Admin

Deliverable:
- Login/logout + proteksi route + unauthorized state.
- Dashboard statistik.
- Event management (create/edit/toggle/archive/delete + flyer upload).
- Guestlist table (search/filter/sort/pagination), detail + signed URL proof,
  approve/reject + konfirmasi + catatan + audit (`reviewed_by`, `reviewed_at`).
- CSV export sesuai filter, aman dari formula injection.

File utama: `src/app/admin/**`, `src/actions/*`, `src/lib/auth/require-admin.ts`,
`src/components/admin/*`, `src/app/api/admin/guestlist/export/route.ts`,
`src/app/api/admin/guestlist/[id]/proof/[kind]/route.ts`.

Checkpoint: seluruh alur admin berjalan end-to-end; role staff vs super_admin
ditegakkan server-side.

### PHASE 5 — Security & QA

Deliverable:
- Test matrix RLS (anon / authenticated non-admin / staff / super_admin) dengan
  hasil aktual.
- Uji upload valid/invalid (tipe, ukuran, spoofed MIME, path traversal).
- Uji duplikat & idempotency, rate limit, Turnstile.
- Uji mobile (360/390/768/1024/1440), keyboard, screen reader dasar,
  reduced motion.
- Uji loading/empty/error/success states.
- CSP enforce, header check, dependency audit.
- Perbaikan bug sebelum lanjut.

Dokumen: `docs/TESTING.md` berisi checklist + hasil.

### PHASE 6 — Deployment

Deliverable:
- Repo GitHub + branch protection minimal.
- Environment variables Vercel (public vs server-only).
- Deploy production + smoke test.
- Custom domain + DNS + HTTPS.
- `README.md` final, `docs/SUPABASE_SETUP.md`, `docs/ADMIN_SETUP.md`,
  `docs/TESTING.md`, `docs/DEPLOYMENT.md`, `docs/CUSTOM_DOMAIN.md`,
  `docs/CONFIGURATION_TODO.md`.

Checkpoint: semua kriteria selesai di §16 master prompt terpenuhi dan
dibuktikan, bukan diklaim.

---

## 9. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|--------|--------|----------|
| R1 | Limit body Vercel 4.5 MB vs 2×5 MB | Upload gagal | Signed upload langsung ke Supabase + kompresi client |
| R2 | RLS salah konfigurasi | Data bukti bocor | Test matrix eksplisit + review policy + uji dengan anon key |
| R3 | Service role key bocor | Total compromise | `server-only`, tidak ada `NEXT_PUBLIC`, audit import, secret rotation |
| R4 | Spam submission | Data kotor, storage penuh | Rate limit + unique index + Turnstile opsional |
| R5 | File spoofed / berbahaya | Risiko XSS/storage abuse | Whitelist MIME, magic bytes, bucket private, SVG dilarang |
| R6 | Nomor WA salah format | RSVP gagal | Normalisasi + validasi DB, fallback informatif |
| R7 | Duplikat policy menghambat operasional | Pendaftar yang di-reject tidak bisa daftar ulang | Prosedur admin (hapus baris lama oleh super_admin) + pesan error mengarahkan hubungi WA |
| R8 | Timezone salah | Tanggal event meleset | Simpan UTC, input/output `Asia/Jakarta`, unit test formatter |
| R9 | Orphan file menumpuk | Biaya storage | Cleanup saat gagal + script berkala |
| R10 | Build butuh akses Google Fonts | Build gagal offline | `next/font` cache; fallback `next/font/local` bila perlu |
| R11 | Admin tanpa profil | Login sukses tapi tidak bisa masuk | Halaman unauthorized + dokumentasi bootstrap |
| R12 | CSV injection | Risiko saat buka Excel | Escape `= + - @` + BOM UTF-8 |

---

## 10. Data yang Masih Dibutuhkan dari Owner

| Data | Placeholder sementara |
|------|-----------------------|
| Logo LOUD JAKARTA | Wordmark teks |
| Font brand | Anton + Inter |
| Warna accent final | `#C6FF00` |
| Instagram resmi | `https://instagram.com/` (disabled) |
| Nomor WhatsApp RSVP default | kosong → tombol disabled |
| Domain final | `localhost` / `*.vercel.app` |
| Flyer event | placeholder generatif |
| Nama/tanggal/venue event | 1 event seed unpublished |
| Daftar PR | text input bebas |
| Email admin pertama | diisi saat setup |
| Alamat/venue lengkap & map | tidak ditampilkan di MVP |
| Privacy policy final | draft 1 paragraf |

---

## 11. Keputusan Final (disetujui 16 Nov 2026)

| Topik | Keputusan |
|-------|-----------|
| Bahasa UI publik | **English** |
| Accent color | **Electric lime `#C6FF00`** (placeholder, via CSS variable) |
| Duplikat guestlist | **Blokir total per event** (1 Instagram = 1 pendaftaran, termasuk setelah rejected) |
| Rencana PHASE 1 | **Disetujui** → lanjut PHASE 2 |

Prasyarat PHASE 2: **terpenuhi** — Node.js 24.20.0, npm 11.19.0, Git 2.56.1.
Hasil verifikasi ada di `docs/PHASE-2-SETUP.md`.
