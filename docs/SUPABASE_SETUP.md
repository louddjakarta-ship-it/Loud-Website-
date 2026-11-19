# Panduan Setup Supabase — LOUD JAKARTA

Panduan ini menghubungkan project Supabase ke aplikasi, menjalankan migration,
dan menyiapkan admin pertama. Ikuti berurutan.

> **Jangan pernah** commit `.env.local` atau mengirim secret key ke chat,
> screenshot publik, atau issue tracker.

---

## 1. Ambil kredensial

Buka [Supabase Dashboard](https://supabase.com/dashboard) → pilih project →
**Project Settings → API**.

| Nilai di dashboard | Variabel di `.env.local` | Scope |
|--------------------|--------------------------|-------|
| Project URL (`https://xxxx.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` | Public |
| Publishable key (`sb_publishable_...`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public |
| Secret key (`sb_secret_...`) | `SUPABASE_SECRET_KEY` | **Server-only** |

Jika project masih memakai key lama:

- `anon public` → boleh dipakai sebagai publishable key.
- `service_role` → boleh dipakai sebagai `SUPABASE_SECRET_KEY`.

`RATE_LIMIT_SALT` sudah di-generate otomatis di `.env.local`. Jika perlu
membuat ulang:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 2. Isi `.env.local`

File `.env.local` sudah dibuat dari `.env.example`. Ganti tiga baris berikut:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
SUPABASE_SECRET_KEY=sb_secret_xxxx
```

Opsional:

```env
NEXT_PUBLIC_DEFAULT_WHATSAPP_NUMBER=628xxxxxxxxxx
NEXT_PUBLIC_INSTAGRAM_URL=https://instagram.com/xxxxxxxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 3. Amankan Supabase Auth

Karena admin dibuat manual (tidak ada self-signup):

1. **Authentication → Providers → Email**
   - Aktifkan Email provider (dipakai Supabase Auth di balik layar).
   - **Allow new users to sign up: matikan.** Akun hanya dibuat dari
     dashboard `/admin/users`.
2. **Authentication → Settings**
   - Biarkan email confirmation sesuai kebutuhan. Saat membuat akun dari
     dashboard Supabase, centang **Auto Confirm User**. Akun yang dibuat dari
     `/admin/users` otomatis terkonfirmasi.
3. **Authentication → Password security**
   - Aktifkan **Prevent use of leaked passwords** (cek HaveIBeenPwned).
     Supabase advisor menandai ini sampai diaktifkan; wajib sebelum production.
4. Login admin memakai **username + password**, bukan email. Tidak ada endpoint
   publik untuk membuat akun admin.

## 4. Jalankan migration

**Cara A — SQL Editor (paling cepat)**

Jalankan migration sesuai urutan:

1. `supabase/migrations/20261116090000_init.sql`
2. `supabase/migrations/20261116050000_harden_functions.sql`
3. `supabase/migrations/20261116100000_submission_attempt_kind.sql`
4. `supabase/migrations/20261117093000_guestlist_share_token.sql`
5. `supabase/migrations/20261117094500_guestlist_link_lookup.sql`
6. `supabase/migrations/20261117110000_event_maps_url.sql`
7. `supabase/migrations/20261117113000_site_settings.sql`
8. `supabase/migrations/20261117115000_gallery_photos.sql`
9. `supabase/migrations/20261118090000_login_rate_limit.sql`

Untuk setiap file: **SQL Editor → New query → paste → Run**. Pastikan tidak ada
error sebelum lanjut ke file berikutnya.

Migration ini membuat:

- enum, tabel `admin_profiles`, `events`, `guestlist`, `submission_attempts`
- constraint, index, trigger `updated_at`
- RLS policies
- helper `private.is_admin()` / `private.is_super_admin()` (schema `private`
  tidak diekspos melalui Data API)
- bucket `event-flyers` (public) dan `guestlist-proofs` (private)
- storage policies
- kolom `submission_attempts.kind` + index rate limit
- kolom `events.guestlist_token` (link guestlist privat) + RPC
  `get_guestlist_event_link` untuk resolusi token tanpa membuka kolomnya ke
  `anon`
- kolom `events.maps_url` + check constraint yang hanya menerima link HTTPS
  Google Maps
- tabel singleton `site_settings` untuk tagline + description hero yang bisa
  diedit dari dashboard (publik hanya bisa membaca)
- tabel `gallery_photos` + bucket publik `gallery-photos` (5 MB,
  jpeg/png/webp) untuk gallery homepage; hanya admin yang bisa insert/delete
  foto maupun object Storage
- kind `login` pada `submission_attempts` untuk rate limit login admin

**Cara B — Supabase CLI**

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

## 5. Seed (opsional)

Jalankan `supabase/seed.sql` di SQL Editor. Ini hanya membuat **satu event
placeholder yang belum dipublikasikan**, sehingga tidak akan muncul di homepage.

Untuk smoke test lokal, event tersebut bisa dipublikasikan sementara:

```sql
update public.events
set is_published = true
where slug = 'placeholder-loud-jakarta-001';
```

Setelah selesai, kembalikan ke `false`. Jangan deploy dengan event placeholder
dalam keadaan published.

### Cleanup bukti orphan

```bash
npm run cleanup:orphans -- --dry-run
npm run cleanup:orphans
```

Script menghapus file di `guestlist-proofs` yang tidak direferensikan oleh baris
`guestlist` dan berumur lebih dari 24 jam. Butuh `SUPABASE_SECRET_KEY` asli.

## 6. Verifikasi

Jalankan di SQL Editor:

```sql
-- Semua tabel harus rowsecurity = true
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- Bucket harus ada, guestlist-proofs harus public = false
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('event-flyers', 'guestlist-proofs');

-- Helper harus ada di schema private (bukan public)
select n.nspname, p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in ('is_admin', 'is_super_admin');
```

Hasil yang diharapkan:

| Cek | Expected |
|-----|----------|
| `admin_profiles`, `events`, `guestlist`, `submission_attempts` | `rowsecurity = true` |
| `event-flyers` | `public = true` |
| `guestlist-proofs` | `public = false` |
| `private.is_admin`, `private.is_super_admin` | ada 2 baris, schema `private` |

## 7. Admin pertama

Database tidak menyimpan admin default. Buat akun asli sebelum membuka
`/admin/login`.

1. **Authentication → Users → Add user**
   - Email internal (mis. `owner@admin.loudjakarta.com`; tidak perlu aktif).
   - Password kuat.
   - Centang **Auto Confirm User**.
2. Copy UUID user tersebut.
3. Jalankan di SQL Editor:

```sql
insert into public.admin_profiles (id, username, display_name, role)
values ('<uuid-user>', 'owner', 'Owner', 'super_admin');
```

4. Login di `/admin/login` dengan username `owner` + password tadi. Akun tanpa
   baris `admin_profiles` aktif akan langsung di-sign out dengan pesan generik.

Untuk menambah admin berikutnya, login lalu buka **`/admin/users`**. Semua akun
yang dibuat dari sana mendapat akses admin yang sama.

## 8. Setelah mengubah `.env.local`

Restart dev server:

```bash
npm run dev
```

## Troubleshooting

| Gejala | Penyebab umum | Solusi |
|--------|---------------|--------|
| `Missing NEXT_PUBLIC_SUPABASE_URL` | `.env.local` belum diisi / server belum restart | Isi file, restart `npm run dev` |
| `Invalid API key` | Key tertukar (publishable vs secret) | Publishable untuk `NEXT_PUBLIC_*`, secret untuk `SUPABASE_SECRET_KEY` |
| `new row violates row-level security policy` | Operasi memakai client tanpa hak | Pastikan operasi admin memakai server client + role benar |
| `/admin` mengembalikan 503 | Env admin belum lengkap | Cek `SUPABASE_SECRET_KEY` dan URL |
| Bucket tidak ditemukan | Migration belum dijalankan | Jalankan ulang migration bagian storage |
| `permission denied for table guestlist` | Grant sengaja dibatasi | Insert publik harus lewat route handler (service role), bukan client |
| `/api/guestlist` mengembalikan 503 | `SUPABASE_SECRET_KEY` masih placeholder / salah | Isi secret asli, restart dev server |
| Upload bukti gagal 503 | Bucket atau secret belum siap | Cek bucket `guestlist-proofs` dan secret key |

## Catatan keamanan

- Bucket `guestlist-proofs` **private**. Preview admin memakai signed URL
  berumur 60 detik.
- `anon` tidak punya akses ke `guestlist`, `admin_profiles`, atau
  `submission_attempts`.
- `authenticated` hanya boleh update kolom review pada `guestlist`
  (`status`, `admin_note`, `reviewed_by`, `reviewed_at`).
- Service role hanya dipakai di server setelah validasi dan otorisasi.
