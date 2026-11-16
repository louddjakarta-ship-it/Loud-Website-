# LOUD JAKARTA

Website event organizer LOUD JAKARTA: upcoming events, RSVP WhatsApp, guestlist
dengan bukti Instagram, dan admin dashboard untuk verifikasi.

Status: **PHASE 3 — Public website selesai di lokal**. Homepage, RSVP WhatsApp,
guestlist form + dua upload bukti, privacy notice, 404, sitemap/robots sudah
terhubung ke Supabase. Admin dashboard menyusul di PHASE 4. Lihat
`docs/PHASE-3-PUBLIC.md` untuk hasil verifikasi dan sisa pekerjaan.

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
- Akun Supabase (untuk PHASE 3+)

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

Aturan: variabel server-only **tidak boleh** diberi prefix `NEXT_PUBLIC_` dan
tidak boleh di-import dari Client Component. Semua akses secret melewati
`src/lib/env/server.ts` (`import "server-only"`).

## Scripts

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Jalankan hasil build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript tanpa emit |
| `npm run cleanup:orphans -- --dry-run` | Lihat file bukti orphan (>24 jam) |
| `npm run cleanup:orphans` | Hapus file bukti orphan |

## Struktur singkat

```text
src/
├── app/
│   ├── (site)/          # homepage, guestlist, privacy (public layout)
│   ├── api/guestlist/   # signed upload URL + final submission
│   ├── not-found.tsx
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── public/          # header, hero, event card, form, footer
│   └── ui/              # button, field primitives
├── lib/
│   ├── data/            # public event queries
│   ├── env/             # validasi env public vs server-only
│   ├── images/          # kompresi bukti di browser
│   ├── storage/         # path, signed upload, magic bytes
│   ├── supabase/        # browser, server, admin, proxy clients
│   ├── validation/      # Zod schema guestlist
│   ├── api.ts
│   ├── format.ts
│   ├── rate-limit.ts
│   ├── turnstile.ts
│   └── whatsapp.ts
├── styles/globals.css   # Tailwind + design tokens
└── proxy.ts             # Next.js 16 Proxy (pengganti middleware)
supabase/
├── migrations/          # schema + hardening + rate-limit kind
└── seed.sql             # satu event placeholder (unpublished)
scripts/
└── cleanup-orphans.mjs  # hapus bukti yang tidak direferensikan
docs/
├── PHASE-1-PLANNING.md
├── PHASE-2-SETUP.md
├── PHASE-3-PUBLIC.md
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

## Keamanan

- `SUPABASE_SECRET_KEY` hanya dipakai di `src/lib/supabase/admin.ts`
  (`import "server-only"`).
- RLS aktif di semua tabel; bucket `guestlist-proofs` private. Publik hanya
  bisa submit lewat route handler yang memvalidasi field, file, duplikat, dan
  rate limit.
- Bukti diverifikasi ulang lewat magic bytes setelah upload; path dibuat server.
- Security headers dasar sudah aktif di `next.config.ts`; CSP nonce menyusul
  di PHASE 5.
- Jangan commit `.env.local` dan jangan pernah menaruh secret di
  `NEXT_PUBLIC_*`.

## Dokumentasi

- `LOUD_JAKARTA_Master_Prompt.md` — brief utama
- `docs/PHASE-1-PLANNING.md` — sitemap, flow, schema, keamanan, design system
- `docs/PHASE-2-SETUP.md` — setup Next.js, Tailwind, Supabase client
- `docs/PHASE-3-PUBLIC.md` — hasil public website + verifikasi
- `docs/SUPABASE_SETUP.md` — kredensial, migration, admin pertama
