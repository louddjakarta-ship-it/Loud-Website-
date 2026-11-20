# PHASE 7 — DJ PRESSKIT & MULTI-ROLE ACCOUNTS

Status: **implemented, build passing, QA 21/21 passed, siap deploy.**
Tanggal: 20 November 2026

Dokumen acuan: `LOUD_JAKARTA_Master_Prompt.md` §4, §6E, §7, §8 dan
`docs/PHASE-1-PLANNING.md` §3.

---

## 1. Scope yang selesai

| Area | Status | File utama |
|------|--------|------------|
| Role `dj` + multi-role per akun (`roles[]`) | Selesai | `supabase/migrations/20261119150000_admin_roles_dj.sql` |
| Helper RLS `private.has_role` / `is_dj` | Selesai | migration yang sama |
| Tabel `djs` + bucket `dj-photos` + policy | Selesai | `supabase/migrations/20261119151000_djs.sql` |
| Halaman publik `/djs` (roster) | Selesai | `src/app/(site)/djs/page.tsx`, `src/components/public/dj-grid.tsx` |
| Halaman publik `/djs/[slug]` (presskit) | Selesai | `src/app/(site)/djs/[slug]/page.tsx` |
| Section DJ di homepage `/#djs` | Selesai | `src/app/(site)/page.tsx`, `src/components/public/dj-grid.tsx` |
| Editor presskit untuk akun DJ `/dj` | Selesai | `src/app/dj/page.tsx`, `src/components/dj/dj-presskit-form.tsx` |
| Upload foto DJ (crop 4:5, WebP, max 5 MB) | Selesai | `src/lib/images/compress.ts`, `src/components/dj/dj-presskit-form.tsx` |
| Halaman akun DJ `/dj/account` (ganti password) | Selesai | `src/app/dj/account/page.tsx` |
| Pilih role saat membuat akun + ubah role | Selesai | `src/app/admin/actions/users.ts`, `/admin/users` |
| Guard server: DJ hanya ke `/dj`, admin tanpa role DJ ditolak | Selesai | `src/lib/auth/admin.ts`, `src/lib/auth/roles.ts` |
| Sitemap + metadata + Open Graph presskit | Selesai | `src/app/sitemap.ts`, `src/app/(site)/djs/[slug]/page.tsx` |
| QA end-to-end DJ presskit | Selesai — 21/21 | `scripts/qa-dj.mjs` |

---

## 2. Model role

`admin_profiles.role` tetap ada untuk kompatibilitas, tetapi sumber kebenaran
adalah `admin_profiles.roles` (array `admin_role`). Satu akun boleh punya
beberapa role sekaligus.

| Role | Akses |
|------|-------|
| `super_admin` | Seluruh dashboard admin, kelola user, hapus event/pendaftar, baca semua presskit (termasuk draft) |
| `staff` | Operasional admin (event, gallery, guestlist, export sesuai policy) |
| `dj` | Hanya `/dj` dan `/dj/account`; membuat/mengedit presskit miliknya sendiri |

Aturan penting:

- `role` diisi role dengan prioritas tertinggi (`primaryRole`) agar kode lama
  tetap benar.
- Login DJ-only langsung diarahkan ke `/dj`; akses `/admin` dialihkan kembali.
- Admin tanpa role `dj` yang membuka `/dj` diarahkan ke
  `/admin/unauthorized?reason=role`.
- Akun DJ tidak bisa melihat atau mengedit presskit DJ lain (RLS + guard).
- Super admin bisa **membaca** presskit draft lewat database, tetapi tidak
  bisa mengedit presskit yang bukan miliknya.

---

## 3. Route baru

| Route | Akses | Catatan |
|-------|-------|---------|
| `/djs` | Publik | Roster presskit published, urut nama panggung |
| `/djs/[slug]` | Publik | Foto, bio, genre, daftar venue, Instagram; `404` untuk draft/unknown |
| `/dj` | Akun dengan role `dj` | Editor presskit (termasuk draft) |
| `/dj/account` | Akun dengan role `dj` | Ganti password sendiri |
| `/admin/users` | `super_admin` | Buat akun admin/DJ, ubah role |

Navigasi publik: `/#events`, `/#djs`, `/#gallery`. Section `#djs` otomatis
menampilkan empty state "DJs coming soon" bila belum ada presskit published.

---

## 4. Database dan storage

### Tabel `public.djs`

| Kolom | Tipe | Catatan |
|-------|------|---------|
| `id` | uuid PK | `gen_random_uuid()` |
| `profile_id` | uuid unique | FK ke `admin_profiles`, `on delete cascade` |
| `stage_name` | text | 1–80 karakter |
| `slug` | text unique | `^[a-z0-9]+(-[a-z0-9]+)*$`, dibuat server dari stage name |
| `bio` | text nullable | maks 2000 karakter |
| `photo_path` | text nullable | path di bucket `dj-photos` |
| `genres` | text[] | maks 12 item |
| `venues` | text[] | maks 50 item |
| `instagram_url` | text nullable | hanya `https://(www.)instagram.com/...` |
| `is_published` | boolean | default `true` |
| `created_at` / `updated_at` | timestamptz | trigger `set_updated_at` |

Index `djs_published_idx` mempercepat daftar published.

### Bucket `dj-photos`

- Public read (foto presskit memang tampil di website).
- Upload/update/delete hanya akun dengan role `dj`, dan hanya di folder
  `storage.foldername(name)[1] = auth.uid()`.
- Batas 5 MB, MIME `image/jpeg`, `image/png`, `image/webp`.
- Foto dikompres di browser menjadi WebP (crop paksa 4:5), lalu path acak
  `<profileId>/<uuid>.webp` disimpan di database — bukan URL permanen.
- Foto lama dihapus dari storage saat diganti atau dihapus.

### RLS `public.djs`

| Policy | Siapa | Aturan |
|--------|-------|--------|
| `djs_select` | anon + authenticated | `is_published` **atau** pemilik **atau** super admin |
| `djs_insert_dj` | authenticated | `profile_id = auth.uid()` dan punya role `dj` |
| `djs_update_dj` | authenticated | pemilik dan punya role `dj` |
| `djs_delete_dj` | authenticated | pemilik dan punya role `dj` |

`anon` hanya punya `select`; semua operasi tulis wajib login dan lolos cek
role di database.

---

## 5. Alur operasional

1. Super admin login → `/admin/users`.
2. Isi username, display name, password (boleh dikosongkan untuk password
   acak), lalu pilih role **DJ** (boleh sekaligus **Admin**).
3. Kirim username + password ke DJ lewat kanal aman.
4. DJ login → otomatis masuk `/dj`, isi stage name, bio, genre, venue,
   Instagram, dan upload foto.
5. Centang **Publish on the public DJ page** agar tampil di `/djs`,
   `/#djs`, dan `/djs/<slug>`.
6. Untuk menyembunyikan sementara, matikan centang publish lalu simpan —
   halaman publik langsung `404` dan roster menyembunyikannya.
7. DJ mengganti password sendiri di `/dj/account`.

Mencabut akses DJ: super admin membuka `/admin/users`, menghapus centang
**DJ**, lalu menyimpan. Akun tetap ada tetapi tidak bisa lagi membuka `/dj`.

---

## 6. Validasi input

- Stage name wajib, maks 80 karakter, tanpa karakter kontrol.
- Bio maks 2000 karakter; newline diizinkan.
- Genre/venue menerima satu item per baris atau dipisah koma; duplikat
  (case-insensitive) dibuang; batas 12 genre dan 50 venue.
- Instagram menerima `@handle`, `handle`, atau URL profil dan dinormalisasi
  menjadi `https://www.instagram.com/<handle>/`.
- CRLF (hasil paste dari dokumen Windows) dinormalisasi menjadi `\n`
  sebelum validasi — sebelumnya karakter `\r` ditolak sebagai "invalid
  characters".
- Path foto diverifikasi ulang di server: harus `<profileId>/<file>.<ext>`
  dan object-nya harus ada di storage sebelum baris disimpan.

---

## 7. QA

`npm run qa:dj` (butuh dev/production server + `SUPABASE_SECRET_KEY` di
`.env.local`). Skrip membuat akun sementara, menguji dua arah guard,
menyimpan presskit + foto, memeriksa tampilan publik sebagai pengunjung
anonim, lalu membersihkan akun, baris `djs`, dan file foto.

Hasil 20 November 2026: **24/24 PASS**.

| Uji | Hasil |
|-----|-------|
| Super admin masuk dashboard | PASS |
| Super admin membuat akun DJ-only dari `/admin/users` | PASS |
| Akun baru hanya punya role `dj` | PASS |
| Login DJ-only mendarat di `/dj` | PASS |
| DJ melihat editor presskit | PASS |
| DJ diarahkan keluar dari `/admin` | PASS |
| DJ bisa membuka `/dj/account` | PASS |
| Simpan presskit + upload foto | PASS |
| URL publik dikembalikan setelah simpan | PASS |
| Baris `djs` menyimpan foto, genre, venue, publish state | PASS |
| `/djs/<slug>` → `200` | PASS |
| Stage name tampil | PASS |
| Genre dan venue tampil | PASS |
| Foto presskit ter-render | PASS |
| `/djs` menampilkan presskit | PASS |
| Homepage `#djs` menampilkan presskit | PASS |
| Nav utama menuju `/#djs` | PASS |
| Pengunjung anonim bisa membaca `/djs` dan `/djs/<slug>` | PASS |
| Slug tidak dikenal → `404` | PASS |
| Unpublish menyembunyikan presskit (`404`) | PASS |
| Admin tanpa role DJ diblokir dari `/dj` | PASS |
| Tidak ada error halaman di browser | PASS |

Catatan: QA ini menemukan dan memperbaiki dua bug nyata:

1. Validasi CRLF pada textarea genre/venue menolak hasil paste dari dokumen
   Windows (`src/lib/validation/dj.ts`).
2. Policy `djs_select` memanggil `private.is_super_admin()` untuk role `anon`,
   sehingga roster publik selalu gagal dibaca pengunjung anonim. Policy
   dipisah menjadi `djs_select_public` (anon) dan `djs_select_authenticated`
   lewat `supabase/migrations/20261120100000_djs_anon_select.sql`.

`npm run lint`, `npm run typecheck`, dan `npm run build` lulus. `npm run
qa:browser` (termasuk `/djs` di 5 viewport) lulus 245/245.

---

## 8. Deploy

1. Jalankan tiga migration baru **berurutan** di Supabase production:
   `20261119150000_admin_roles_dj.sql`, `20261119151000_djs.sql`, lalu
   `20261120100000_djs_anon_select.sql`. Enum `dj` harus selesai di-commit
   sebelum migration kedua memakainya.
2. Pastikan bucket `dj-photos` muncul di Storage (dibuat migration).
3. Deploy seperti biasa; tidak ada environment variable baru.
4. Smoke test production:
   - `/djs` → `200` (empty state bila belum ada presskit).
   - `/dj` tanpa login → redirect `/admin/login`.
   - Buat akun DJ uji, publish presskit, cek `/djs/<slug>`, lalu hapus akun
     dan presskit uji.

---

## 9. Data yang masih menunggu owner

- Nama panggung, bio, genre, dan daftar venue DJ asli.
- Foto presskit resmi (rasio potret).
- Akun Instagram tiap DJ (opsional).
- Keputusan apakah roster DJ ditampilkan di nav utama sejak awal atau hanya
  setelah ada presskit published.

Lihat juga `docs/CONFIGURATION_TODO.md`.
