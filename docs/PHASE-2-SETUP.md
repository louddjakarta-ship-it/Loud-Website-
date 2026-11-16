# PHASE 2 — Project Setup (selesai)

Tanggal: 16 November 2026
Status: **Selesai dan terverifikasi**

## Lingkungan

| Tool | Versi | Catatan |
|------|-------|---------|
| Node.js | 24.20.0 | Dipasang via `winget install OpenJS.NodeJS.LTS --scope user` |
| npm | 11.19.0 | |
| Git | 2.56.1 | Repo diinisialisasi, branch `main` |
| Next.js | 16.4.6 | App Router, Turbopack |
| React | 19.3.0 | |
| Tailwind CSS | 4.3.3 | `@tailwindcss/turbopack` |
| TypeScript | 5.x | strict |
| `@supabase/ssr` | 0.12.7 | |
| `@supabase/supabase-js` | 2.119.0 | |
| Zod | 4.6.7 | |

## Yang dibuat

```text
.env.example
.gitignore                    # + !.env.example
README.md
next.config.ts                # remotePatterns, security headers, Turbopack CSS
package.json                  # name: loud-jakarta, script typecheck
src/
├── app/
│   ├── layout.tsx            # font Anton + Inter, metadata, skip link
│   └── page.tsx              # halaman setup check (placeholder)
├── components/ui/button.tsx
├── lib/
│   ├── cn.ts
│   ├── env/
│   │   ├── public.ts         # NEXT_PUBLIC_* (static references)
│   │   └── server.ts         # server-only: secret, salt, limit
│   └── supabase/
│       ├── admin.ts          # service role + import "server-only"
│       ├── browser.ts        # publishable key
│       ├── proxy.ts          # refresh session
│       └── server.ts         # RSC / actions / route handlers
├── proxy.ts                  # Next.js 16 Proxy (pengganti middleware)
└── styles/globals.css        # Tailwind v4 @theme tokens
```

## Keputusan teknis

1. **Proxy, bukan middleware.** Next.js 16 mengganti `middleware.ts` menjadi
   `src/proxy.ts`. Proxy melakukan refresh cookie + redirect optimistis.
   Otorisasi sesungguhnya tetap di layout/action/route handler.
2. **Cache Components dimatikan.** `cacheComponents` dan `partialPrefetching`
   dihapus dari `next.config.ts` karena hampir semua route dinamis. Model cache
   klasik dipakai (revalidatePath/revalidateTag).
3. **Env dipisah public/server.** `src/lib/env/public.ts` memakai referensi
   statis `process.env.NEXT_PUBLIC_*` agar ter-inline di browser. Secret hanya
   di `src/lib/env/server.ts` dengan `import "server-only"`.
4. **Supabase client dipecah tiga.** Browser (publishable), server (cookies +
   RLS), admin (secret + bypass RLS).
5. **Design token di Tailwind v4 `@theme`.** Accent `#C6FF00`, font display
   Anton, body Inter, skala tipografi fluid.
6. **Security headers dasar** aktif di `next.config.ts`. CSP nonce ditunda ke
   PHASE 5.

## Verifikasi

| Pemeriksaan | Hasil |
|-------------|-------|
| `npm run build` | ✅ Compiled, TypeScript, 3 static pages |
| `npm run typecheck` | ✅ Tidak ada error |
| `npm run lint` | ✅ Tidak ada warning/error |
| `GET /` (dev, port 3100) | ✅ HTTP 200, copy & font tampil |
| `GET /admin` tanpa env | ✅ HTTP 503 (fail closed, tidak bocor detail) |
| CSS tokens terkompilasi | ✅ `--color-accent: #c6ff00`, `--font-display` |
| `npm audit` | ⚠️ 7 moderate, **dev-only** (`typescript-eslint` → `minimatch`); tidak masuk production bundle |

## Catatan / batasan saat ini

- Belum ada project Supabase, jadi `.env.local` belum dibuat dan route admin
  sengaja mengembalikan 503.
- Halaman `/` masih placeholder desain (belum mengambil data event).
- RLS, Storage policies, dan migration belum ada (PHASE 3).
- `npm audit fix` tidak menyelesaikan 7 moderate karena constraint versi
  `eslint-config-next`; akan ditinjau ulang di PHASE 5.
- Git identity repo diset lokal ke `LOUD JAKARTA <dev@loudjakarta.local>`
  sebagai placeholder; dapat diubah sebelum push ke GitHub.

## Prasyarat PHASE 3

1. Project Supabase dibuat (region terdekat, mis. Singapore).
2. URL + publishable key + secret key dimasukkan ke `.env.local`.
3. Email admin pertama disiapkan untuk bootstrap `super_admin`.
