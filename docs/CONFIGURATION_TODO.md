# Configuration & Data TODO — LOUD JAKARTA

Daftar hal yang masih memakai placeholder atau harus diisi owner sebelum
production. Update dokumen ini setiap kali satu item selesai.

Terakhir diperbarui: 18 November 2026.

---

## 1. Ringkasan status

| # | Item | Status | Pemilik |
|---|------|--------|---------|
| 1 | Domain final | **Belum ada** | Owner |
| 2 | Repo GitHub + remote | **Selesai** — `louddjakarta-ship-it/Loud-Website-`, branch `main` | Owner/dev |
| 3 | Project Vercel + deploy production | **Belum ada** | Owner |
| 4 | Logo resmi | Placeholder (wordmark teks) | Owner/desain |
| 5 | Nomor WhatsApp RSVP | Perlu konfirmasi | Owner |
| 6 | Instagram resmi | Perlu konfirmasi | Owner |
| 7 | Flyer event asli | Placeholder generatif | Owner |
| 8 | Data event (nama, tanggal, venue, map) | Sebagian dummy | Owner |
| 9 | Daftar PR | Input bebas di form | Owner |
| 10 | Email admin pertama | Perlu konfirmasi | Owner |
| 11 | Privacy policy final | Draft | Owner |
| 12 | Turnstile production keys | Opsional | Owner |
| 13 | Leaked-password protection | **Belum aktif** | Owner |
| 14 | Warna accent final | Placeholder `#C6FF00` | Owner |
| 15 | Font brand final | Anton + Inter | Owner |
| 16 | Jadwal cleanup orphan | Manual | Owner/dev |

---

## 2. Detail per item

### 1. Domain final

- **Sekarang:** `localhost` / `*.vercel.app`.
- **Ubah:**
  - Vercel env `NEXT_PUBLIC_SITE_URL=https://<domain>`.
  - Supabase → Authentication → URL Configuration.
- **Ikuti:** `docs/CUSTOM_DOMAIN.md`.
- **Verifikasi:** `sitemap.xml` dan metadata memakai domain final.

### 2. Repo GitHub

- **Status:** selesai. Remote `origin` →
  `https://github.com/louddjakarta-ship-it/Loud-Website-`, branch `main`
  sudah di-push dan tracking `origin/main`.
- **Sisa:** pasang branch protection minimal (butuh akses GitHub owner), lalu
  tambahkan CI bila diinginkan (`docs/DEPLOYMENT.md` §9).
- **Jangan:** commit `.env.local`, secret key, token guestlist asli.
- **Verifikasi:** `git remote -v` dan `git ls-remote --heads origin`.

### 3. Vercel

- **Langkah:** import repo, isi env production/preview
  (`docs/DEPLOYMENT.md` §5–§6), deploy, smoke test §7.
- **Verifikasi:** homepage 200, `/admin` 307, CSP + HSTS ada.

### 4. Logo

- **Sekarang:** wordmark teks "LOUD JAKARTA" di
  `src/components/public/site-header.tsx`, `mobile-nav.tsx`,
  `site-footer.tsx`, dan `src/components/admin/admin-shell.tsx`.
- **Jika ada file logo:** simpan di `public/`, ganti wordmark dengan
  `next/image`, sediakan alt yang sesuai, dan pastikan ukuran file kecil
  (SVG/WebP).
- **Jangan** memakai gambar berisi teks dekoratif tanpa alt yang jelas.

### 5. Nomor WhatsApp

- **Env:** `NEXT_PUBLIC_DEFAULT_WHATSAPP_NUMBER` (digit saja, awalan negara,
  tanpa `+`, spasi, atau tanda hubung). Contoh: `6281234567890`.
- Nomor per event bisa diisi di field WhatsApp pada form event; nilai env
  hanya fallback.
- **Verifikasi:** tombol RSVP membuka `wa.me/<nomor>` dengan pesan berisi nama
  event. Jika nomor kosong, tombol menampilkan state "contact coming soon".

### 6. Instagram

- **Env:** `NEXT_PUBLIC_INSTAGRAM_URL=https://instagram.com/<akun>`.
- Jika kosong, UI menampilkan state "coming soon" (bukan link palsu).
- **Verifikasi:** link di header/footer membuka profil yang benar.

### 7. Flyer event

- Upload lewat `/admin/events/<id>/edit` atau form event baru.
- Format: JPG/PNG/WebP; kompresi dilakukan di browser.
- **Sebelum launch:** hapus flyer placeholder/dummy dan upload flyer asli.
- **Verifikasi:** homepage menampilkan flyer, bukan placeholder generatif.

### 8. Data event

Isi lewat admin dashboard:

- Nama event, tanggal + waktu (disimpan UTC, tampil `Asia/Jakarta`).
- Venue dan link Google Maps (HTTPS, domain maps).
- Deskripsi singkat.
- `registration_open` dan `is_published` sesuai kebutuhan.

**Sebelum launch:**

- [ ] Hapus/arsipkan event dummy `LOUD JAKARTA 002–006` jika bukan event nyata.
- [ ] Pastikan `PLACEHOLDER — LOUD JAKARTA 001` tetap unpublished.
- [ ] Cek tanggal tidak meleset (zona waktu).
- [ ] Cek link Maps hanya menerima HTTPS yang valid.

### 9. Daftar PR

- Field "PR" di form guestlist adalah input teks bebas, bukan dropdown.
- Jika owner ingin daftar tetap, perlu perubahan kode + validasi; catat sebagai
  backlog, bukan blocker launch.

### 10. Email admin

- Dibuat manual di Supabase Auth (lihat `docs/ADMIN_SETUP.md`).
- Gunakan email yang benar-benar dimonitor owner.
- Jangan memakai email pribadi staff untuk akun owner.

### 11. Privacy policy

- **Sekarang:** draft di `src/app/(site)/privacy/page.tsx`; menyebut WhatsApp
  dan Instagram "akan ditambahkan".
- **Perlu:** konfirmasi owner bahwa isi sesuai praktik nyata (data yang
  disimpan, retensi, kontak penghapusan data).
- Setelah nomor/Instagram diisi, perbarui bagian Contact agar tidak lagi
  menyebut "will be added".
- Ini bukan nasihat hukum; minta review owner bila perlu.

### 12. Turnstile

- **Sekarang:** opsional dan kosong secara default.
- Jika diaktifkan: isi `NEXT_PUBLIC_TURNSTILE_SITE_KEY` **dan**
  `TURNSTILE_SECRET_KEY` (pasangan), daftarkan hostname domain di Cloudflare.
- Jangan isi salah satu saja: form akan meminta token tetapi server menolak,
  atau sebaliknya.
- **Verifikasi:** submission tanpa token ditolak `turnstile_failed`; dengan
  token valid berhasil.

### 13. Leaked-password protection

- Supabase Dashboard → **Authentication → Password security** → aktifkan
  **Prevent use of leaked passwords**.
- Tidak bisa lewat SQL. Advisor akan tetap menandai sampai aktif.
- **Verifikasi:** advisor "Leaked password protection disabled" hilang.

### 14. Warna accent

- **Sekarang:** `#C6FF00` di `src/styles/globals.css` (`--color-accent`).
- Ganti di satu tempat; token lain mengikuti.
- **Verifikasi:** kontras teks di atas accent tetap ≥ 4.5:1 (teks kecil) dan
  axe browser QA tetap lulus.

### 15. Font brand

- **Sekarang:** Anton (display) + Inter (body) via `next/font/google` di
  `src/app/layout.tsx`.
- Jika brand punya font sendiri: letakkan file di `src/fonts/` (atau
  `public/fonts/`), ganti ke `next/font/local`, dan perbarui variabel
  `--font-display` / body.
- **Verifikasi:** build tetap offline-safe (font lokal), tidak ada layout
  shift besar.

### 16. Cleanup orphan

- Script: `npm run cleanup:orphans -- --dry-run` lalu
  `npm run cleanup:orphans`.
- Butuh `SUPABASE_SECRET_KEY` production.
- Belum ada cron terproteksi. Jadwalkan manual bulanan, atau tambahkan route
  cron terproteksi di phase berikutnya.
- **Verifikasi:** dry-run tidak menghapus apa pun; file yang direferensikan
  tetap ada.

---

## 3. Checklist sebelum go-live

- [ ] Semua migration di Supabase production sudah dijalankan (9 file).
- [ ] Admin production bisa login; staff (jika ada) punya role benar.
- [ ] Sign-up publik mati; leaked-password protection aktif.
- [ ] Domain + HTTPS aktif; `NEXT_PUBLIC_SITE_URL` sudah diperbarui dan
      redeploy.
- [ ] Supabase Site URL + Redirect URLs memakai domain final.
- [ ] Nomor WhatsApp dan Instagram asli terisi (atau state "coming soon"
      diterima owner).
- [ ] Event dummy/QA dibersihkan; hanya event nyata yang published.
- [ ] Flyer asli terpasang; tidak ada placeholder generatif.
- [ ] Privacy policy disetujui owner.
- [ ] Turnstile diputuskan: aktif dengan pasangan key, atau kosong.
- [ ] `npm run lint`, `typecheck`, `build` lulus.
- [ ] Smoke test `docs/DEPLOYMENT.md` §7 lulus.
- [ ] Link guestlist dibagikan dari domain final.
- [ ] Secret key disimpan di password manager owner.

---

## 4. Catatan perubahan

| Tanggal | Perubahan | Oleh |
|---------|-----------|------|
| 18 Nov 2026 | Dokumen dibuat; status awal sebelum deploy | Dev |
| 18 Nov 2026 | Repo GitHub `louddjakarta-ship-it/Loud-Website-` dibuat, branch `main` di-push | Dev |
