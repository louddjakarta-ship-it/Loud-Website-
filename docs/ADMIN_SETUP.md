# Admin Setup & Operasional Akun — LOUD JAKARTA

Panduan membuat, mengubah, dan mencabut akun admin. Untuk alur harian
(manage event, review guestlist, gallery, export CSV) lihat
`docs/PHASE-4-ADMIN.md`.

Tidak ada self-signup. Semua akun dibuat manual oleh owner lewat Supabase
Dashboard + SQL Editor.

---

## 1. Model akses

| Lapisan | Apa yang menentukan akses |
|---------|---------------------------|
| Supabase Auth | Username + password; sesi dikelola cookie oleh `@supabase/ssr` |
| `public.admin_profiles` | `username` (login handle), `role`, dan `is_active` |
| RLS + helper `private.is_admin()` | Menolak user tanpa profil aktif |
| Server action / route handler | Cek role sebelum aksi sensitif |
| UI | Menyembunyikan tombol yang tidak diizinkan, bukan pengganti otorisasi |

Login di `/admin/login` memakai **username + password**, bukan email. Server
mencari baris `admin_profiles` berdasarkan username, lalu memverifikasi
password ke Supabase Auth. Login dianggap berhasil hanya jika user punya baris
`admin_profiles` dengan `is_active = true`. Jika tidak, sesi langsung diakhiri
dengan pesan generik.

Akun baru dibuat dari halaman **`/admin/users`** oleh admin yang sudah login.
Semua akun yang dibuat dari halaman itu mendapat akses admin yang sama.

### Hak per role

| Aksi | staff | super_admin |
|------|-------|-------------|
| Lihat event draft/arsip | Ya | Ya |
| Buat/ubah event | Ya | Ya |
| Arsipkan/hapus event | Tidak | Ya |
| Lihat & review guestlist | Ya | Ya |
| Hapus pendaftar | Tidak | Ya |
| Export CSV | Tidak | Ya |
| Ubah homepage copy | Ya | Ya |
| Kelola gallery | Ya | Ya |
| Kelola profil admin lain | Tidak | Ya |

---

## 2. Admin pertama

Lakukan sekali saat setup project. Detail kredensial ada di
`docs/SUPABASE_SETUP.md` §7.

1. Supabase Dashboard → **Authentication → Users → Add user**.
   - Email internal (mis. `owner@admin.loudjakarta.com`; tidak perlu aktif).
   - Password kuat dan unik.
   - Centang **Auto Confirm User**.
2. Copy UUID user.
3. SQL Editor:

   ```sql
   insert into public.admin_profiles (id, username, display_name, role)
   values ('<uuid-user>', 'owner', 'Owner', 'super_admin');
   ```

4. Buka `/admin/login`, login dengan username `owner` + password tadi, lalu
   pastikan dashboard tampil.
5. Simpan kredensial di password manager. Jangan kirim lewat chat atau commit.

Jika langkah 3 terlewat, login akan ditolak walau password benar. Itu perilaku
yang disengaja.

---

## 3. Menambah admin

Cara utama: login ke dashboard, buka **`/admin/users`**, lalu isi:

- **Display name** — nama yang tampil di dashboard.
- **Username** — 3–32 karakter, huruf kecil, angka, titik, underscore, dash.
- **Password** — biarkan kosong untuk membuat password sementara 16 karakter.

Password hanya ditampilkan **sekali** setelah akun dibuat. Copy dan kirim ke
user lewat kanal aman, lalu minta user menggantinya di **`/admin/account`**
setelah login.

Semua akun yang dibuat dari halaman ini mendapat akses admin yang sama. Tidak
ada pilihan role di UI dan tidak ada self-signup.

Jika perlu membuat akun lewat SQL (mis. saat bootstrap), ikuti §2 dan isi
kolom `username`.

---

## 4. Menonaktifkan akses

Gunakan `is_active`, jangan langsung hapus baris profil kecuali yakin.

```sql
-- Cabut akses tanpa menghapus histori
update public.admin_profiles
set is_active = false
where id = '<uuid-user>';
```

Efek:

- Request berikutnya ditolak RLS dan server guard.
- Sesi yang masih hidup tidak bisa melakukan aksi admin; user diarahkan ke
  halaman unauthorized/login.
- Baris `reviewed_by` pada guestlist tetap menunjuk user tersebut (histori
  audit utuh).

Untuk memutus sesi segera, hapus/revoke user di Supabase Auth
(**Authentication → Users → user → Revoke sessions / Delete user**). Menghapus
user Auth akan meng-cascade profil bila FK di-set cascade; cek dulu apakah
histori review perlu dipertahankan.

---

## 5. Mengubah role

```sql
update public.admin_profiles
set role = 'super_admin'
where id = '<uuid-user>';
```

Lakukan hanya untuk owner/lead. Turunkan role kembali setelah kebutuhan
sementara selesai. Perubahan berlaku pada request berikutnya; minta user logout
dan login ulang agar UI memuat menu yang benar.

---

## 6. Reset password dan lockout

### Ganti password sendiri

Setiap admin yang sudah login bisa membuka **`/admin/account`**, memasukkan
password saat ini, lalu memilih password baru (minimal 10 karakter). Ini jalur
utama setelah menerima password sementara dari admin lain.

### Lupa password

1. Supabase Dashboard → **Authentication → Users** → pilih user →
   **Reset password** / kirim recovery.
2. Atau set password baru langsung dari dashboard (Auto Confirm).
3. Minta user login ulang dan keluar dari perangkat lama.

### Terkena rate limit login

Login dibatasi **10 percobaan / 15 menit** per kombinasi hash IP + username
(`submission_attempts.kind = 'login'`). Setelah batas tercapai, login
mengembalikan pesan generik sampai jendela waktu lewat.

- Tunggu 15 menit, atau
- Hapus baris rate limit untuk username tersebut (butuh akses SQL):

  ```sql
  delete from public.submission_attempts
  where kind = 'login'
    and created_at > now() - interval '15 minutes';
  ```

Jangan mematikan rate limit kecuali sedang menangani insiden; kolom ini tidak
menyimpan IP mentah, hanya hash.

### Akun terkunci karena `is_active = false`

Pastikan memang disengaja. Jika tidak, set kembali `true` dan minta user login.

---

## 7. Audit dan pemantauan

- Setiap review guestlist mengisi `reviewed_by` + `reviewed_at` lewat trigger;
  status tidak bisa dikembalikan ke `pending`.
- Perubahan event menyimpan `updated_at`; pembuat event tercatat di
  `created_by`.
- Untuk melihat admin aktif:

  ```sql
  select p.username, p.display_name, p.role, p.is_active, u.email,
         u.last_sign_in_at
  from public.admin_profiles p
  join auth.users u on u.id = p.id
  order by p.role, p.display_name;
  ```

- Review akses setiap kali staff keluar: nonaktifkan profil dan revoke sesi.
- Jangan memberi `super_admin` ke akun bersama.

---

## 8. Troubleshooting login

| Gejala | Penyebab umum | Solusi |
|--------|---------------|--------|
| Login selalu "invalid credentials" | Password salah / user belum dikonfirmasi | Reset password, pastikan Auto Confirm |
| Login sukses lalu langsung ditolak | Tidak ada baris `admin_profiles` atau `is_active = false` | Insert/aktifkan profil (§2, §4) |
| "Terlalu banyak percobaan" | Rate limit 10/15 menit | Tunggu atau bersihkan baris `kind = 'login'` (§6) |
| Redirect loop ke `/admin/login` | Cookie sesi tidak terbaca / domain beda | Pastikan `NEXT_PUBLIC_SITE_URL` dan domain konsisten; clear cookie |
| `/admin` 503 | `SUPABASE_SECRET_KEY` / URL belum diset | Isi env server, restart/redeploy |
| Setelah ganti role menu tidak berubah | Sesi lama | Logout lalu login ulang |
| Login berhasil di lokal, gagal di production | Site URL Supabase masih localhost | Perbarui Authentication → URL Configuration |

---

## 9. Checklist keamanan akun

- [ ] Sign-up publik dimatikan di Supabase Auth.
- [ ] **Prevent use of leaked passwords** aktif.
- [ ] Setiap admin punya akun sendiri; tidak ada akun bersama.
- [ ] Password disimpan di password manager, bukan dokumen repo.
- [ ] `super_admin` hanya untuk owner/lead.
- [ ] Staff yang keluar dinonaktifkan + sesi direvoke.
- [ ] Redirect URL Supabase hanya domain resmi + preview yang diperlukan.
- [ ] Secret key hanya ada di `.env.local` dan environment Vercel
      (server-only), tidak pernah di `NEXT_PUBLIC_*`.
- [ ] Review daftar admin (§7) setiap kuartal.
