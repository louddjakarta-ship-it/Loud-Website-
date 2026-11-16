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
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 3. Amankan Supabase Auth

Karena admin dibuat manual (tidak ada self-signup):

1. **Authentication → Providers → Email**
   - Pastikan Email provider **enabled** (untuk login admin).
   - Matikan **Allow new users to sign up**.
2. **Authentication → Settings**
   - Biarkan email confirmation sesuai kebutuhan. Saat membuat admin manual
     dari dashboard, centang **Auto Confirm User**.
3. Tidak ada endpoint publik untuk membuat akun admin.

## 4. Jalankan migration

**Cara A — SQL Editor (paling cepat)**

1. Buka **SQL Editor** → **New query**.
2. Copy seluruh isi `supabase/migrations/20261116090000_init.sql`.
3. Klik **Run**.
4. Pastikan tidak ada error. Migration ini membuat:
   - enum, tabel `admin_profiles`, `events`, `guestlist`, `submission_attempts`
   - constraint, index, trigger `updated_at`
   - RLS policies + helper `is_admin()` / `is_super_admin()`
   - bucket `event-flyers` (public) dan `guestlist-proofs` (private)
   - storage policies

**Cara B — Supabase CLI**

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

## 5. Seed (opsional)

Jalankan `supabase/seed.sql` di SQL Editor. Ini hanya membuat **satu event
placeholder yang belum dipublikasikan**, sehingga tidak akan muncul di homepage.

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

-- Helper harus ada
select proname from pg_proc
where proname in ('is_admin', 'is_super_admin');
```

Hasil yang diharapkan:

| Cek | Expected |
|-----|----------|
| `admin_profiles`, `events`, `guestlist`, `submission_attempts` | `rowsecurity = true` |
| `event-flyers` | `public = true` |
| `guestlist-proofs` | `public = false` |
| `is_admin`, `is_super_admin` | ada 2 baris |

## 7. Admin pertama (dibutuhkan di PHASE 4)

1. **Authentication → Users → Add user**
   - Email admin asli.
   - Password kuat.
   - Centang **Auto Confirm User**.
2. Copy UUID user tersebut.
3. Jalankan di SQL Editor:

```sql
insert into public.admin_profiles (id, display_name, role)
values ('<uuid-user>', 'Owner', 'super_admin');
```

4. Login akan diuji di `/admin/login` pada PHASE 4.

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

## Catatan keamanan

- Bucket `guestlist-proofs` **private**. Preview admin memakai signed URL
  berumur 60 detik.
- `anon` tidak punya akses ke `guestlist`, `admin_profiles`, atau
  `submission_attempts`.
- `authenticated` hanya boleh update kolom review pada `guestlist`
  (`status`, `admin_note`, `reviewed_by`, `reviewed_at`).
- Service role hanya dipakai di server setelah validasi dan otorisasi.
