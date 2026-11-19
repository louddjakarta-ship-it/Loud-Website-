# LOUD JAKARTA

Website event organizer LOUD JAKARTA: upcoming events, RSVP WhatsApp, gallery
foto, dan guestlist privat lewat link yang dibagikan admin.

Status: **PHASE 5 — Security & QA selesai; PHASE 6 — Deployment production
aktif.** Public website (homepage, RSVP WhatsApp, gallery) dan admin dashboard
(login, event management, gallery, homepage copy, guestlist link, review
guestlist, CSV export) sudah terhubung ke Supabase dan berjalan di
**https://loud-jakarta.vercel.app**. Domain final masih menunggu owner;
panduannya ada di `docs/CUSTOM_DOMAIN.md`. Data yang masih placeholder ada di
`docs/CONFIGURATION_TODO.md`.
Guestlist bersifat **link-only**: pengunjung hanya melihat upcoming events,
sedangkan form guestlist hanya terbuka lewat `/guestlist/<token>` yang
di-copy admin dari `/admin/events`.

QA: 43 uji RLS/Storage, 18 uji API guestlist, 3 uji Turnstile, 3 uji rate
limit login, dan 245 uji browser (responsive + axe WCAG A/AA) semuanya lulus.
CSP nonce dan security headers sudah aktif. Lihat `docs/TESTING.md` untuk hasil
lengkap dan sisa uji manual. Item yang masih butuh data owner ada di
`docs/CONFIGURATION_TODO.md`.

## Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Bahasa | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Database / Storage / Auth | Supabase |
| Validasi | Zod |
| Hosting | Vercel |
| Version control | Git + GitHub |

## Prasyarat

- Node.js **20.9+** (disarankan LTS terbaru)
- npm
- Akun Supabase
- Akun admin di Supabase Auth + baris `admin_profiles` (lihat
  `docs/SUPABASE_SETUP.md` §7)

Cek versi:

```bash
node -v
npm -v
```

## Setup lokal

```bash
# 1. Install dependency
npm install

# 2. Siapkan environment
cp .env.example .env.local
# lalu isi nilai asli di .env.local

# 3. Jalankan dev server
npm run dev
```

Buka http://localhost:3000.

### Environment variables

| Variabel | Scope | Wajib | Keterangan |
|----------|-------|-------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Ya | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Ya | Publishable key (`sb_publishable_...`) |
| `NEXT_PUBLIC_SITE_URL` | Public | Tidak | Default `http://localhost:3000` |
| `NEXT_PUBLIC_DEFAULT_WHATSAPP_NUMBER` | Public | Tidak | Fallback nomor RSVP, digit saja |
| `NEXT_PUBLIC_INSTAGRAM_URL` | Public | Tidak | URL profil Instagram resmi |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | Tidak | Cloudflare Turnstile (opsional) |
| `SUPABASE_SECRET_KEY` | **Server-only** | Ya | Secret key (`sb_secret_...`), bypass RLS |
| `RATE_LIMIT_SALT` | **Server-only** | Ya | Salt hash IP untuk rate limit |
| `TURNSTILE_SECRET_KEY` | **Server-only** | Tidak | Wajib jika site key diisi |
| `GUESTLIST_MAX_FILE_MB` | **Server-only** | Tidak | Default `5` |
| `CRON_SECRET` | **Server-only** | Tidak | Bearer token untuk `/api/cron/cleanup-orphans`; minimal 16 karakter |

Aturan: variabel server-only **tidak boleh** diberi prefix `NEXT_PUBLIC_` dan
tidak boleh di-import dari Client Component. Semua akses secret melewati
`src/lib/env/server.ts` (`import "server-only"`).

## Guestlist link (privat)

Guestlist tidak punya halaman publik. Alurnya:

1. Login admin → `/admin/events`.
2. Klik **Copy guestlist link** pada event yang sudah published dan
   `registration_open`.
3. Kirim link `https://<site>/guestlist/<token>` ke tamu.
4. Tamu mengisi form yang sudah terkunci ke event tersebut; admin mereview di
   `/admin/guestlist`.

Catatan keamanan:

- `/guestlist` selalu `404`; hanya `/guestlist/<token>` yang valid bisa dibuka.
- `events.guestlist_token` adalah UUID acak dan tidak bisa dibaca `anon`.
  Resolusi token memakai RPC `get_guestlist_event_link`.
- Link mati otomatis saat event di-unpublish, di-archive, `registration_open`
  dimatikan, atau tanggal event lewat.
- Cabut link lama dengan merotasi token:

  ```sql
  update public.events
  set guestlist_token = gen_random_uuid()
  where id = '<event-id>';
  ```

## Gallery homepage

- Foto gallery tampil di section `/#gallery` pada homepage. Section otomatis
  disembunyikan jika belum ada foto.
- Hanya admin aktif yang bisa upload/delete, lewat `/admin/gallery`.
- Foto dikompres di browser (crop paksa 16:9, maks 2400 px, WebP) lalu
  diunggah langsung ke
  bucket publik `gallery-photos` memakai sesi admin; metadata dicatat server
  action ke tabel `gallery_photos`.
- Pengunjung hanya bisa membaca. Upload anon ditolak Storage RLS, insert anon
  ditolak RLS tabel (`42501`).
- Upload **tidak** memakai `SUPABASE_SECRET_KEY`, jadi tetap berfungsi walau
  secret belum diisi.

## Homepage copy

Tagline dan description hero bisa diedit dari section **Homepage copy** di
`/admin`, disimpan di tabel singleton `site_settings`. Publik hanya bisa
membaca; perubahan langsung tampil setelah disimpan.

## Scripts

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Jalankan hasil build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript tanpa emit |
| `npm run qa:rls` | Matriks RLS + Storage (butuh secret key) |
| `npm run qa:api` | Uji upload/duplikat/rate limit API guestlist |
| `npm run qa:browser` | Responsive + CSP + axe WCAG (butuh server jalan) |
| `npm run qa:turnstile` | Uji token Turnstile wajib (server terpisah) |
| `npm run qa:login` | Uji rate limit login admin |
| `npm run cleanup:orphans -- --dry-run` | Lihat file bukti orphan (>24 jam) |
| `npm run cleanup:orphans` | Hapus file bukti orphan |

Cleanup juga berjalan otomatis lewat Vercel Schedules setiap hari pukul
03:00 WIB (`vercel.json` → `/api/cron/cleanup-orphans`, butuh `CRON_SECRET`).
Detail di `docs/DEPLOYMENT.md` §8.

## Struktur singkat

```text
src/
├── app/
│   ├── (site)/          # homepage, guestlist privat, privacy (public layout)
│   ├── admin/           # login, dashboard, events, gallery, guestlist, actions
│   ├── api/
│   │   ├── cron/        # scheduled orphan-proof cleanup
│   │   ├── guestlist/   # signed upload URL + final submission
│   │   └── admin/       # CSV export + signed proof URL
│   ├── not-found.tsx
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── admin/           # shell, event form, gallery upload, login form, confirm form
│   ├── public/          # header, hero, event card, gallery, form, footer
│   └── ui/              # button, field primitives
├── lib/
│   ├── admin/           # guestlist filter parsing, action state
│   ├── auth/            # session guard + role checks
│   ├── data/            # public event/gallery/site-settings queries
│   ├── env/             # validasi env public vs server-only
│   ├── images/          # kompresi bukti/flyer + magic bytes
│   ├── security/        # CSP nonce builder
│   ├── storage/         # path, signed upload, verifikasi bukti
│   ├── supabase/        # browser, server, admin, proxy clients
│   ├── validation/      # Zod schema guestlist/event/gallery/settings
│   ├── api.ts
│   ├── format.ts
│   ├── rate-limit.ts
│   ├── turnstile.ts
│   └── whatsapp.ts
├── styles/globals.css   # Tailwind + design tokens
└── proxy.ts             # Next.js 16 Proxy (pengganti middleware)
supabase/
├── migrations/          # schema + hardening + fitur per phase
├── seed.sql             # satu event placeholder (unpublished)
└── seed-demo.sql        # 5 event dummy published (khusus preview lokal)
scripts/
├── cleanup-orphans.mjs  # hapus bukti yang tidak direferensikan
└── qa-*.mjs             # skrip QA PHASE 5 (RLS, API, browser, login, Turnstile)
preview/                 # screenshot UI untuk dokumentasi
docs/
├── PHASE-1-PLANNING.md
├── PHASE-2-SETUP.md
├── PHASE-3-PUBLIC.md
├── PHASE-4-ADMIN.md
├── TESTING.md           # hasil QA + sisa uji manual
├── DEPLOYMENT.md        # deploy Vercel + smoke test
├── CUSTOM_DOMAIN.md     # domain, DNS, HTTPS
├── ADMIN_SETUP.md       # buat/kelola akun admin
├── CONFIGURATION_TODO.md# data owner yang masih placeholder
├── qa-*-results.md      # tabel hasil QA mentah
└── SUPABASE_SETUP.md
```

## Keputusan teknis PHASE 2

1. **Next.js 16 Proxy** (`src/proxy.ts`) menggantikan `middleware.ts`. Proxy
   hanya melakukan refresh sesi + redirect optimistis; otorisasi sebenarnya
   tetap di layout, server action, dan route handler.
2. **Cache Components dimatikan** untuk MVP karena hampir semua route dinamis.
   Cache klasik + `revalidatePath`/`revalidateTag` lebih sederhana.
3. **Upload bukti akan memakai signed upload URL** langsung ke Supabase Storage
   (limit body Vercel ~4.5 MB tidak cukup untuk 2×5 MB).
4. **Accent color** `#C6FF00` adalah placeholder; ubah di
   `src/styles/globals.css` (`--color-accent`).

## Admin

- Login: `http://localhost:3000/admin/login` (Supabase Auth).
- Akun harus punya baris aktif di `admin_profiles`; jika tidak, login ditolak.
- Role: `super_admin` (semua aksi) dan `staff` (event + review guestlist).
  Arsip/hapus event, hapus pendaftar, dan CSV export khusus super admin.
- Izin diperiksa di server action/route handler dan database, bukan hanya UI.
- Review guestlist mencatat reviewer dan waktu lewat trigger database.
- Preview bukti memakai signed URL yang berlaku 60 detik.

Panduan operasional ada di `docs/PHASE-4-ADMIN.md`.

## Keamanan

- `SUPABASE_SECRET_KEY` hanya dipakai di `src/lib/supabase/admin.ts`
  (`import "server-only"`).
- RLS aktif di semua tabel; bucket `guestlist-proofs` private. Publik hanya
  bisa submit lewat route handler yang memvalidasi field, file, duplikat, dan
  rate limit.
- Bukti diverifikasi ulang lewat magic bytes setelah upload; path dibuat server.
- Security headers + **CSP nonce** aktif (`src/proxy.ts`,
  `src/lib/security/csp.ts`). Semua halaman dirender dinamis agar nonce bisa
  diterapkan; tidak ada `unsafe-inline` untuk script.
- Login admin dibatasi 10 percobaan / 15 menit per kombinasi IP + email
  (`submission_attempts.kind = 'login'`, hanya hash yang disimpan).
- Guestlist dibatasi 10 signed URL / 10 menit dan 5 submission / jam per IP
  hash; Turnstile wajib bila secret diisi.
- Jangan commit `.env.local` dan jangan pernah menaruh secret di
  `NEXT_PUBLIC_*`.

## Dokumentasi

- `LOUD_JAKARTA_Master_Prompt.md` — brief utama
- `docs/PHASE-1-PLANNING.md` — sitemap, flow, schema, keamanan, design system
- `docs/PHASE-2-SETUP.md` — setup Next.js, Tailwind, Supabase client
- `docs/PHASE-3-PUBLIC.md` — hasil public website + verifikasi
- `docs/PHASE-4-ADMIN.md` — hasil admin dashboard, izin, audit, verifikasi
- `docs/TESTING.md` — checklist dan hasil Security & QA (PHASE 5)
- `docs/DEPLOYMENT.md` — langkah deploy ke Vercel + smoke test (PHASE 6)
- `docs/CUSTOM_DOMAIN.md` — domain, DNS, HTTPS, Supabase Auth URL
- `docs/ADMIN_SETUP.md` — membuat dan mencabut akun admin
- `docs/CONFIGURATION_TODO.md` — data/konfigurasi yang masih menunggu owner
- `docs/SUPABASE_SETUP.md` — kredensial, migration, admin pertama
