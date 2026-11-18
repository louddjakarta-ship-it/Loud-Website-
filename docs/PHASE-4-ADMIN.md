# PHASE 4 — ADMIN DASHBOARD

Status: **implemented locally, build passing, smoke test passed, QA data
removed.**
Tanggal: 17 November 2026

Dokumen acuan: `LOUD_JAKARTA_Master_Prompt.md` §6 dan
`docs/PHASE-1-PLANNING.md` §3.4, §5, §7.

---

## 1. Scope yang selesai

| Area | Status | File utama |
|------|--------|------------|
| Login Supabase Auth + logout | Selesai | `src/app/admin/login/*`, `src/components/admin/login-form.tsx` |
| Proteksi route admin (proxy + server guard) | Selesai | `src/proxy.ts`, `src/lib/auth/admin.ts` |
| Dashboard statistik + antrian pending | Selesai | `src/app/admin/(dashboard)/page.tsx` |
| Event list + status badges + aksi cepat | Selesai | `src/app/admin/(dashboard)/events/page.tsx` |
| Buat/edit event + upload flyer + kompresi | Selesai | `src/app/admin/actions/events.ts`, `src/components/admin/event-form.tsx` |
| Link Google Maps per event (khusus admin) | Selesai | `src/lib/validation/event.ts`, `src/components/admin/event-form.tsx` |
| Publish/unpublish + buka/tutup guestlist | Selesai | server actions di `events.ts` |
| Copy guestlist link privat per event | Selesai | `src/components/admin/copy-guestlist-link.tsx`, `src/app/admin/(dashboard)/events/page.tsx` |
| Edit tagline + description hero dari dashboard | Selesai | `src/components/admin/site-settings-form.tsx`, `src/app/admin/actions/site-settings.ts` |
| Upload/hapus foto gallery homepage | Selesai | `src/app/admin/(dashboard)/gallery/page.tsx`, `src/components/admin/gallery-upload-form.tsx` |
| Arsip, restore, hapus event (super admin) | Selesai | server actions + `ConfirmForm` |
| Guestlist table: search, filter event/status, sort, pagination | Selesai | `src/app/admin/(dashboard)/guestlist/page.tsx`, `src/lib/admin/guestlist-filters.ts` |
| Detail pendaftar + preview dua bukti | Selesai | `src/app/admin/(dashboard)/guestlist/[id]/page.tsx` |
| Signed URL bukti 60 detik | Selesai | `src/app/api/admin/guestlist/[id]/proof/[kind]/route.ts` |
| Approve/reject + konfirmasi + admin note | Selesai | `src/app/admin/actions/guestlist.ts` |
| Audit reviewer + waktu review | Selesai (trigger database) | `supabase/migrations/20261116090000_init.sql` |
| CSV export mengikuti filter aktif | Selesai | `src/app/api/admin/guestlist/export/route.ts` |
| Role `super_admin` / `staff` di server | Selesai | `src/lib/auth/admin.ts`, RLS |
| Hapus pendaftar + bersihkan bukti (super admin) | Selesai | `src/app/admin/actions/guestlist.ts` |

---

## 2. Route admin

| Route | Akses | Catatan |
|-------|-------|---------|
| `/admin/login` | Publik | Redirect ke `/admin` bila sudah login |
| `/admin` | Admin aktif | Statistik total event/pendaftar/status |
| `/admin/events` | Admin aktif | Semua event termasuk draft dan arsip + copy guestlist link |
| `/admin/events/new` | Admin aktif | Form create + upload flyer |
| `/admin/events/[id]/edit` | Admin aktif | Form edit + preview flyer + URL guestlist lengkap |
| `/admin/gallery` | Admin aktif | Upload + daftar + hapus foto gallery homepage |
| `/admin/guestlist` | Admin aktif | Table + filter + pagination 25/halaman |
| `/admin/guestlist/[id]` | Admin aktif | Detail + proof + review |
| `/admin/unauthorized` | Publik (informatif) | Akun login tanpa profil admin |
| `/api/admin/guestlist/export` | **Super admin** | CSV, 401/403 untuk yang tidak berhak |
| `/api/admin/guestlist/[id]/proof/[kind]` | Admin aktif | `kind` = `story` atau `comment` |

### Guestlist link

Guestlist tidak dibuka dari menu publik. Admin mengambil link privat per
event:

- Tombol **Copy guestlist link** ada di daftar `/admin/events` dan di halaman
  edit event (ditampilkan sebagai input readonly + tombol Copy/Open).
- URL berbentuk `https://<NEXT_PUBLIC_SITE_URL>/guestlist/<guestlist_token>`.
- `guestlist_token` dibuat otomatis oleh database (`gen_random_uuid()`),
  unik per event, dan tidak bisa dibaca role `anon`.
- Link hanya hidup selama event published, belum di-archive,
  `registration_open = true`, dan tanggal event belum lewat.
- Rotasi token (lihat `README.md` §Guestlist link) mencabut link lama.

### Google Maps link

- Field **Google Maps link** hanya ada di form admin (create/edit event).
- Hanya menerima URL `https://` di host Google Maps: `maps.app.goo.gl`,
  `goo.gl/maps/...`, `google.*/maps...`, atau `maps.google.*`.
- Disimpan di `events.maps_url`; `anon` hanya punya `SELECT` pada kolom ini,
  tidak bisa menulis. Database juga punya check constraint sebagai lapisan
  kedua.
- Jika diisi, kartu event publik menampilkan tombol **Open in Google Maps**.
  Kosongkan jika venue belum ada.

### Homepage copy

- Dashboard `/admin` punya section **Homepage copy** untuk mengedit tagline dan
  description hero.
- Data disimpan di tabel singleton `public.site_settings` (satu baris,
  `id = true`). Tagline maksimal 2 baris; baris pertama putih, baris kedua
  memakai warna accent.
- `anon` bisa membaca; hanya admin aktif yang bisa update
  (`private.is_admin()` + column grants). Server action memakai sesi admin,
  bukan service role.
- Setelah disimpan, `revalidatePath("/")` membuat homepage langsung berubah.
  Jika baris gagal dibaca, homepage memakai teks default bawaan aplikasi.

### Gallery

- Menu **Gallery** di nav admin membuka `/admin/gallery`.
- Admin memilih JPG/PNG/WEBP (maks 20 MB), opsional caption (maks 160
  karakter), lalu **Upload photo**.
- Browser memotong paksa ke **16:9 dari tengah** (center crop), mengompres ke
  WebP maksimal 2400 px, lalu mengunggah langsung ke bucket
  `gallery-photos` memakai sesi admin, lalu server action mencatat metadata di
  `gallery_photos` setelah memverifikasi object benar-benar ada.
- Jika pencatatan metadata gagal, file yang sudah terunggah dihapus lagi.
- Tombol **Delete** menghapus baris dan object Storage sekaligus.
- Upload tidak memakai service role, jadi tetap berfungsi meskipun
  `SUPABASE_SECRET_KEY` belum asli.
- Foto terbaru tampil maksimal 12 di homepage (`/#gallery`); section otomatis
  hilang saat gallery kosong.

---

## 3. Alur autentikasi dan otorisasi

1. `/admin/login` memakai `supabase.auth.signInWithPassword` — tidak ada
   sistem password sendiri.
2. Setelah login, profil `admin_profiles` dicek. Akun tanpa profil aktif
   langsung di-sign out dan mendapat pesan generik.
3. `src/proxy.ts` hanya melakukan refresh cookie + redirect optimistis.
   Otorisasi sebenarnya selalu dijalankan ulang di server:
   - `requireAdmin()` pada layout dan halaman admin.
   - `getAdminSession()` pada setiap server action dan route handler admin.
   - RLS + trigger database untuk pertahanan terakhir.
4. `next` pada login hanya menerima path yang diawali `/admin` agar tidak
   bisa dipakai open redirect.

### Matriks izin

| Aksi | Staff | Super admin |
|------|:-----:|:-----------:|
| Lihat dashboard/event/guestlist | ✅ | ✅ |
| Buat/edit event | ✅ | ✅ |
| Publish/unpublish, buka/tutup guestlist | ✅ | ✅ |
| Approve/reject + admin note | ✅ | ✅ |
| Upload/hapus foto gallery | ✅ | ✅ |
| Arsip/restore event | ❌ | ✅ |
| Hapus event | ❌ | ✅ |
| Hapus pendaftar | ❌ | ✅ |
| Export CSV | ❌ | ✅ |

Pembatasan role diperiksa di server action/route handler **dan** di database
(trigger arsip event serta policy RLS). Menyembunyikan tombol di UI bukan
satu-satunya kontrol.

---

## 4. Audit review

Review guestlist tidak mengirim `reviewed_by`/`reviewed_at` dari aplikasi.
Trigger `set_guestlist_review_audit` di database yang mengisinya:

- `reviewed_by` = `auth.uid()` saat status berubah dari `pending`.
- `reviewed_at` = waktu perubahan.
- Status tidak boleh dikembalikan ke `pending`.
- Perubahan status hanya lewat jalur yang diizinkan RLS.

Selain itu, update memakai `.eq("status", "pending")` sehingga dua admin yang
mereview bersamaan tidak bisa saling menimpa; reviewer kedua mendapat pesan
"already reviewed".

---

## 5. Verifikasi yang sudah dijalankan

| Uji | Hasil |
|-----|-------|
| `npm run typecheck` | Lulus tanpa error |
| `npm run build` | Lulus; semua route admin terdaftar sebagai dynamic |
| Login admin sementara + buka `/admin`, `/admin/events`, `/admin/events/new`, `/admin/guestlist`, detail guestlist | HTTP 200 |
| Anonymous buka `/admin/*` | Redirect 307 ke `/admin/login` |
| Anonymous panggil `/api/admin/guestlist/export` | HTTP 401 |
| Admin panggil export dengan filter `status=pending` | HTTP 200, CSV benar, formula injection dinetralkan |
| Signed URL bukti untuk path yang tidak ada | HTTP 404 (tidak membocorkan path) |
| Login page saat sudah login | Redirect 307 ke `/admin` |
| Admin upload foto gallery + insert metadata | Berhasil; file bisa dibaca publik (HTTP 200) |
| Anon upload ke bucket gallery / insert metadata | Ditolak Storage RLS + `42501` |
| Anon baca metadata + public URL gallery | HTTP 200 |
| Upload foto 3:4 lewat UI admin | Tersimpan `1200x675` (rasio `1.7778`, crop 16:9) |
| Homepage tanpa foto | Section gallery tidak dirender |

Catatan: smoke test memakai akun QA sementara dan route login QA. Setelah
pengujian, route, file HTML debug, akun QA, dan baris guestlist QA sudah
dihapus. Database sekarang berisi schema saja tanpa admin — admin asli harus
dibuat lewat langkah di `docs/SUPABASE_SETUP.md` §7.

Pengujian approve/reject end-to-end dengan bukti asli tetap perlu dilakukan
saat admin asli dan event asli sudah tersedia (lihat §8).

Screenshot bukti visual ada di `preview/` (lihat `preview/README.md`).

---

## 6. File baru/changed utama

```text
src/app/admin/login/{page.tsx,actions.ts}
src/app/admin/unauthorized/page.tsx
src/app/admin/(dashboard)/layout.tsx
src/app/admin/(dashboard)/page.tsx
src/app/admin/(dashboard)/error.tsx
src/app/admin/(dashboard)/events/page.tsx
src/app/admin/(dashboard)/events/new/page.tsx
src/app/admin/(dashboard)/events/[id]/edit/page.tsx
src/app/admin/(dashboard)/guestlist/page.tsx
src/app/admin/(dashboard)/guestlist/[id]/page.tsx
src/app/admin/(dashboard)/gallery/page.tsx
src/app/admin/actions/{events.ts,guestlist.ts,site-settings.ts,gallery.ts}
src/app/api/admin/guestlist/export/route.ts
src/app/api/admin/guestlist/[id]/proof/[kind]/route.ts
src/components/admin/{admin-shell,confirm-form,event-form,login-form,site-settings-form,gallery-upload-form}.tsx
src/lib/admin/{event-action-state.ts,guestlist-filters.ts}
src/lib/auth/{admin.ts,login-state.ts}
src/lib/images/magic-bytes.ts
src/lib/validation/event.ts
src/lib/format.ts                  # konversi datetime-local ↔ Asia/Jakarta
src/lib/images/compress.ts         # kompresi flyer 2000 px / WebP 0.85
src/lib/storage/proofs.ts          # magic bytes dipindah ke modul bersama
src/proxy.ts
```

Tidak ada perubahan tabel inti: `admin_profiles`, kolom `archived_at`,
`is_active`, dan trigger audit sudah dibuat di migration PHASE 2/3. Fitur
tambahan punya migration sendiri: `20261117113000_site_settings.sql` dan
`20261117115000_gallery_photos.sql`.

---

## 7. Catatan keamanan

- CSV export memakai BOM UTF-8 dan menetralkan sel yang diawali
  `= + - @ tab CR` untuk mencegah formula injection.
- Nama file flyer dan bukti selalu dibuat server (UUID), bukan nama asli.
- Bukti guestlist tidak pernah memakai public URL; route admin membuat signed
  URL 60 detik dan mengirim `cache-control: no-store` +
  `referrer-policy: no-referrer`.
- Error internal hanya dicatat di server (kode/`reason`), tidak ditampilkan
  ke pengguna.
- Flyer dibatasi 4 MB setelah kompresi di browser dan diverifikasi lewat
  magic bytes.
- Hapus pendaftar menghapus baris lebih dulu, lalu membersihkan storage
  sebagai best-effort; script `cleanup:orphans` menjadi jaring pengaman.

---

## 8. Sisa pekerjaan / batasan MVP

| Item | Keterangan |
|------|------------|
| Admin asli | Belum ada akun admin produksi; buat lewat `SUPABASE_SETUP.md` §7 |
| Uji review dengan bukti asli | Perlu event asli + submission asli |
| Notifikasi WhatsApp | Sengaja tidak diimplementasikan (sesuai brief) |
| UI manajemen staff | Belum ada; staff ditambahkan lewat SQL/Supabase |
| CSP nonce | Dijadwalkan PHASE 5 |
| Rate limit login | Belum ada; pertimbangkan di PHASE 5 |
| Preview bukti inline | Saat ini membuka signed URL di tab baru |

---

## 9. Perintah verifikasi

```bash
npm run lint
npm run typecheck
npm run build
```

Untuk mencoba admin:

```bash
npm run dev
# buka http://localhost:3000/admin/login
```

Pastikan akun admin sudah dibuat lebih dulu (`docs/SUPABASE_SETUP.md` §7).

Untuk preview dengan data contoh, jalankan isi `supabase/seed-demo.sql` di
Supabase SQL Editor. File itu membuat 5 event published bertanggal masa depan
dan **hanya untuk lokal/preview** — jangan dijalankan di production.
