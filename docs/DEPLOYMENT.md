# Panduan Deployment — LOUD JAKARTA

Dokumen ini menjelaskan cara membawa project dari mesin lokal ke Vercel
production. Semua langkah diuji terhadap build lokal Next.js 16; langkah yang
butuh akun/domain milik owner ditandai jelas.

Status saat dokumen ditulis (18 November 2026): aplikasi **belum di-deploy**.
Repo lokal belum punya remote GitHub, dan domain final belum ditentukan.

---

## 1. Ringkasan urutan

1. Pastikan build lokal bersih (`lint`, `typecheck`, `build`).
2. Siapkan Supabase production (migration, admin, Auth settings).
3. Push repo ke GitHub.
4. Import repo ke Vercel dan isi environment variables.
5. Deploy, lalu jalankan smoke test.
6. Pasang domain dan HTTPS (`docs/CUSTOM_DOMAIN.md`).
7. Selesaikan item di `docs/CONFIGURATION_TODO.md`.

Jangan lompat ke langkah 4 sebelum langkah 2 selesai: tanpa tabel, bucket, dan
admin, halaman publik akan error dan login admin tidak bisa dipakai.

---

## 2. Checklist sebelum deploy

Jalankan di root project:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

Semua harus lulus. Build produksi juga memastikan `next/font/google` bisa
mengunduh Anton + Inter; Vercel punya akses jaringan untuk itu.

Periksa juga:

- [ ] `.env.local` **tidak** ikut ter-commit (`git status --short` bersih).
- [ ] Tidak ada secret di file yang di-commit:
      `git grep -n "sb_secret_"` harus kosong.
- [ ] Migration terbaru (`20261118090000_login_rate_limit.sql`) sudah ada di
      repo dan sudah dijalankan di Supabase tujuan.
- [ ] Event placeholder `PLACEHOLDER — LOUD JAKARTA 001` berstatus
      `is_published = false`.
- [ ] Data QA sudah bersih (tidak ada event/akun/guestlist berlabel QA).

---

## 3. Supabase production

Ada dua pilihan. Pilih satu dan catat di `docs/CONFIGURATION_TODO.md`.

### Opsi A — pakai project yang sudah ada (paling cepat)

Cocok untuk launch pertama dengan satu owner. Project
`helzylxwjbhoodwbvpyk` sudah berisi semua migration dan admin.

Yang tetap harus dilakukan:

1. Aktifkan **Authentication → Password security → Prevent use of leaked
   passwords** (action item advisor, tidak bisa lewat SQL).
2. Pastikan **Allow new users to sign up** mati.
3. Isi **Authentication → URL Configuration**:
   - Site URL: `https://<domain-final>`
   - Redirect URLs: `https://<domain-final>/**` dan
     `https://<project>.vercel.app/**` (untuk preview).
4. Hapus data demo/preview yang tidak ingin tampil di production.

### Opsi B — project Supabase terpisah untuk production (disarankan)

Memisahkan data development dan production.

1. Buat project baru di [Supabase Dashboard](https://supabase.com/dashboard).
2. Jalankan seluruh migration **berurutan** sesuai
   `docs/SUPABASE_SETUP.md` §4 (9 file).
3. Buat admin pertama sesuai §7 dokumen yang sama.
4. Seed hanya jika memang ingin event placeholder; jangan publish.
5. Ambil URL, publishable key, dan secret key project baru untuk Vercel.
6. Aktifkan ulang proteksi leaked password dan matikan sign-up.

Bucket `event-flyers`, `guestlist-proofs`, dan `gallery-photos` dibuat oleh
migration. Tidak perlu membuat bucket manual.

---

## 4. Push ke GitHub

Repo lokal belum punya remote. Buat repo kosong (tanpa README) di GitHub, lalu:

```bash
git remote add origin https://github.com/<akun>/<repo>.git
git branch -M main
git push -u origin main
```

Saran branch protection minimal (Settings → Branches → `main`):

- Require a pull request before merging (1 approval, atau 0 untuk solo owner
  dengan status check wajib).
- Require status checks: CI build (lihat §9) bila sudah ada.
- Block force pushes dan deletions.

Jangan pernah menaruh `.env.local`, secret key, atau token guestlist asli di
repo, issue, atau screenshot publik.

---

## 5. Import ke Vercel

1. Vercel Dashboard → **Add New → Project** → import repo GitHub.
2. Framework preset: **Next.js** (terdeteksi otomatis).
3. Root directory: root repo.
4. Build command: `npm run build`. Output: `.next` (default).
5. Node.js version: **20.9+** (disarankan 22 LTS).
6. Environment variables: isi tabel §6 untuk **Production** dan **Preview**.

Catatan Next.js 16 di Vercel:

- `src/proxy.ts` berjalan sebagai Proxy (pengganti middleware). Tidak ada
  konfigurasi tambahan.
- Semua halaman dirender dinamis karena CSP nonce memakai `connection()`.
  Jangan mengaktifkan cache HTML penuh di CDN; data event memang dinamis.
- `next/image` mengoptimasi gambar dari `*.supabase.co`; pastikan domain
  Supabase production tetap `https://*.supabase.co` (sudah di
  `next.config.ts`).

---

## 6. Environment variables di Vercel

| Variabel | Scope | Production | Preview | Catatan |
|----------|-------|------------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Wajib | Wajib | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Wajib | Wajib | `sb_publishable_...` |
| `NEXT_PUBLIC_SITE_URL` | Public | Wajib | Opsional | `https://<domain-final>`; **di-inline saat build** |
| `NEXT_PUBLIC_DEFAULT_WHATSAPP_NUMBER` | Public | Sesuai owner | Sama | Digit saja, tanpa `+` |
| `NEXT_PUBLIC_INSTAGRAM_URL` | Public | Sesuai owner | Sama | Kosong = state "coming soon" |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | Opsional | Opsional | Harus berpasangan dengan secret |
| `SUPABASE_SECRET_KEY` | **Server-only** | Wajib | Wajib | Jangan pernah `NEXT_PUBLIC_` |
| `RATE_LIMIT_SALT` | **Server-only** | Wajib | Wajib | **Nilai berbeda** dari lokal |
| `TURNSTILE_SECRET_KEY` | **Server-only** | Opsional | Opsional | Wajib jika site key diisi |
| `GUESTLIST_MAX_FILE_MB` | **Server-only** | Opsional | Opsional | Default `5` |

Aturan penting:

- `NEXT_PUBLIC_*` ditanam ke bundle browser. Jangan pernah menaruh secret di
  sana.
- `NEXT_PUBLIC_SITE_URL` dipakai untuk metadata, sitemap, robots, dan link
  absolut. Ganti nilainya **sebelum** build/deploy berikutnya.
- Buat `RATE_LIMIT_SALT` production baru:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
  Jangan pakai salt lokal agar hash rate limit tidak bisa dibandingkan.
- Jika memakai Opsi B (Supabase terpisah), jangan mencampur key dev dan
  production dalam satu environment.
- Setelah mengubah env di Vercel, **redeploy** — env dibaca saat build/start.

---

## 7. Smoke test setelah deploy

Ganti `<base>` dengan `https://<domain-final>` atau URL `*.vercel.app`.

### Halaman dan status

```bash
curl -s -o /dev/null -w "%{http_code}\n" <base>/
curl -s -o /dev/null -w "%{http_code}\n" <base>/privacy
curl -s -o /dev/null -w "%{http_code}\n" <base>/guestlist
curl -s -o /dev/null -w "%{http_code}\n" <base>/halaman-tidak-ada
curl -s -o /dev/null -w "%{http_code}\n" <base>/admin
curl -s -o /dev/null -w "%{http_code}\n" <base>/admin/login
```

Harapan: `200`, `200`, `404`, `404`, `307` (ke login), `200`.

### Security headers

```bash
curl -sI <base>/ | grep -Ei "content-security-policy|strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy|cross-origin-opener"
```

Harapan:

- `Content-Security-Policy` berisi `nonce-...` dan `strict-dynamic`, **tanpa**
  `unsafe-inline` pada `script-src`.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`,
  `Cross-Origin-Opener-Policy: same-origin`.

### Alur manual

- [ ] Homepage menampilkan event published; section gallery muncul hanya jika
      ada foto.
- [ ] Tombol RSVP membuka `wa.me` dengan pesan berisi nama event.
- [ ] `/guestlist/<token>` milik event published bisa dibuka; token acak
      menghasilkan 404.
- [ ] Submit guestlist uji berhasil, lalu hapus baris + object-nya.
- [ ] `/admin/login` bisa login dengan admin production.
- [ ] Dashboard, events, gallery, guestlist, CSV export berfungsi.
- [ ] Upload bukti dan preview signed URL (60 detik) berfungsi.
- [ ] Logout mengembalikan ke halaman login.
- [ ] Browser console bersih (tidak ada pelanggaran CSP/error 500).

Hapus semua data uji setelah smoke test. Jangan biarkan submission atau akun
QA tertinggal.

---

## 8. Setelah deploy

- Pasang domain: `docs/CUSTOM_DOMAIN.md`.
- Aktifkan Supabase leaked-password protection dan cek advisor kembali.
- Sinkronkan Site URL + Redirect URLs Supabase dengan domain final.
- Ganti nomor WhatsApp, Instagram, logo, dan flyer sesuai
  `docs/CONFIGURATION_TODO.md`.
- Simpan salinan secret key di password manager owner. Jangan di chat.
- Jadwalkan review bulanan: advisor Supabase, `npm audit --omit=dev`,
  ukuran bucket `guestlist-proofs`, dan baris `submission_attempts`.

### Cleanup bukti orphan

`npm run cleanup:orphans` membutuhkan `SUPABASE_SECRET_KEY`. Saat ini belum ada
endpoint cron terproteksi, jadi jalankan dari mesin yang punya `.env.local`
production, atau tambahkan route cron terproteksi di phase berikutnya. Jangan
mengekspos script ini sebagai endpoint publik.

---

## 9. CI (GitHub Actions)

Workflow sudah ada di `.github/workflows/ci.yml` dan berjalan pada setiap push
ke `main` serta pull request:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Workflow hanya memakai `NEXT_PUBLIC_SITE_URL` placeholder. Build tidak
membutuhkan Supabase public/secret key karena halaman dirender dinamis; query
database baru berjalan saat request.

Aktifkan sebagai required check di GitHub → Settings → Branches → `main` →
**Require status checks to pass** → pilih **Lint, typecheck, build**.

Jangan menambahkan `SUPABASE_SECRET_KEY` ke CI build: build tidak
membutuhkannya, dan secret server tidak boleh dipakai untuk prerender.

---

## 10. Rollback

- **Vercel**: Deployments → pilih deployment terakhir yang sehat → **Promote to
  Production**. Tidak perlu rebuild.
- **Supabase**: migration bersifat maju (forward-only). Sebelum migration
  berisiko, ambil backup dari Dashboard → Database → Backups. Untuk rollback
  data, pulihkan backup; jangan menjalankan `drop` manual di production.
- **Env salah**: perbaiki di Vercel, lalu redeploy. Ingat `NEXT_PUBLIC_*`
  butuh build baru.

---

## 11. Batasan yang diketahui

- HTML tidak di-cache CDN karena CSP nonce + `connection()`. Trafik normal
  event organizer masih jauh di bawah batas Vercel.
- Belum ada endpoint laporan CSP (`report-to`); pelanggaran hanya terlihat di
  console browser saat QA.
- `npm audit` masih melaporkan 14 high **dev-only** di toolchain ESLint;
  `npm audit --omit=dev` = 0. Lihat `docs/TESTING.md` §6.
- Turnstile opsional. Jika site key diisi tetapi secret kosong, form tetap
  meminta token dan submission akan ditolak; isi keduanya atau kosongkan
  keduanya.
- Cleanup orphan belum terjadwal otomatis (§8).
