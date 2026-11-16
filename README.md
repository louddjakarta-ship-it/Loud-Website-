# LOUD JAKARTA

Website event organizer LOUD JAKARTA: upcoming events, RSVP WhatsApp, guestlist
dengan bukti Instagram, dan admin dashboard untuk verifikasi.

Status: **PHASE 2 — Project setup selesai (fondasi)**. Halaman publik dan admin
belum diimplementasikan; lihat `docs/PHASE-1-PLANNING.md` untuk rencana lengkap.

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

## Struktur singkat

```text
src/
├── app/                 # routes (App Router)
├── components/          # public, admin, ui
├── lib/
│   ├── env/             # validasi env public vs server-only
│   ├── supabase/        # browser, server, admin, proxy clients
│   └── cn.ts
├── styles/globals.css   # Tailwind + design tokens
└── proxy.ts             # Next.js 16 Proxy (pengganti middleware)
supabase/
├── migrations/          # (PHASE 3)
└── seed.sql             # (PHASE 3)
docs/
└── PHASE-1-PLANNING.md
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
- RLS dan Storage policies belum dibuat (PHASE 3).
- Security headers dasar sudah aktif di `next.config.ts`; CSP nonce menyusul
  di PHASE 5.
- Jangan commit `.env.local`.

## Dokumentasi

- `LOUD_JAKARTA_Master_Prompt.md` — brief utama
- `docs/PHASE-1-PLANNING.md` — sitemap, flow, schema, keamanan, design system
