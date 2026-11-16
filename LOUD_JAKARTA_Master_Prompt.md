# MASTER PROMPT --- LOUD JAKARTA WEBSITE

Salin seluruh prompt ini ke AI coding assistant (misalnya ChatGPT,
Cursor, Claude Code, atau Windsurf). Gunakan sebagai brief utama untuk
membangun website LOUD JAKARTA.

------------------------------------------------------------------------

## 1. PERAN DAN TUJUAN

Bertindak sebagai senior full-stack developer, UI/UX designer, dan
software architect. Bangun website production-ready untuk event
organizer bernama **LOUD JAKARTA**.

Website harus terinspirasi oleh pendekatan visual dan pengalaman digital
https://www.razzledazzle.world/, tetapi jangan menyalin desain, aset,
teks, atau identitas mereka secara persis. Buat identitas visual
orisinal untuk LOUD JAKARTA.

Fokus website: 1. Menampilkan upcoming events melalui flyer. 2.
Mengarahkan RSVP ke WhatsApp. 3. Menyediakan pendaftaran guestlist
dengan upload bukti Instagram. 4. Menyediakan admin dashboard untuk
mengelola event dan memverifikasi guestlist.

Bangun website yang cepat, responsive, aman, mudah dikelola, dan siap
deploy ke Vercel.

## 2. BRAND DAN ART DIRECTION

Brand: LOUD JAKARTA\
Karakter: underground nightlife, electronic music, contemporary culture,
bold, experimental, premium.

Arah visual: - Dark editorial / underground. - Background hitam pekat,
teks putih, abu-abu sebagai warna sekunder. - Accent color dapat berupa
electric lime atau merah, digunakan secara terbatas. - Typography
sans-serif bold atau condensed. - Oversized typography, layout
editorial, ruang kosong yang cukup. - Flyer menjadi elemen visual
utama. - Animasi halus dan tidak berlebihan. - Hover state yang terasa
premium. - Mobile-first dan responsive. - Hindari tampilan template SaaS
generik.

Buat desain orisinal yang terasa seperti platform event/nightlife
independen. Jangan gunakan logo, foto, poster, atau aset milik website
referensi. Gunakan placeholder yang jelas sampai aset brand resmi
diberikan.

Tagline sementara: "WE DON'T FOLLOW THE NOISE. WE MAKE IT."

## 3. TEKNOLOGI

Gunakan: - Next.js dengan App Router. - TypeScript. - Tailwind CSS. -
Supabase PostgreSQL untuk database. - Supabase Storage untuk flyer dan
bukti guestlist. - Supabase Auth untuk login admin. - Vercel untuk
deployment. - GitHub untuk version control.

Gunakan versi package yang stabil dan kompatibel. Jangan menggunakan API
deprecated. Jika ada keputusan teknis yang belum ditentukan, pilih opsi
yang aman, sederhana, dan mudah dipelihara, lalu dokumentasikan.

## 4. HALAMAN PUBLIC

### A. Homepage `/`

Buat homepage dengan susunan:

1.  Navbar
    -   Logo/wordmark LOUD JAKARTA.
    -   Navigasi Upcoming Events, Guestlist, Instagram.
    -   Mobile navigation yang rapi.
2.  Hero section
    -   Wordmark atau headline besar "WE MAKE NOISE."
    -   Identitas Jakarta / music / culture.
    -   Visual editorial yang kuat.
3.  Upcoming Events
    -   Tampilkan event aktif.
    -   Flyer menjadi fokus utama.
    -   Setiap event menampilkan flyer, nama event, tanggal, dan venue
        jika tersedia.
    -   Tombol RSVP via WhatsApp.
    -   Jika tidak ada event aktif, tampilkan empty state yang tetap
        dirancang dengan baik.
4.  Guestlist call-to-action
    -   Arahkan pengunjung ke halaman `/guestlist`.
5.  Footer
    -   LOUD JAKARTA.
    -   Instagram.
    -   Kontak atau WhatsApp.
    -   Copyright.

### B. Guestlist page `/guestlist`

Sediakan pilihan event yang masih menerima pendaftaran, lalu form dengan
field wajib:

1.  Full Name --- text.
2.  Instagram Username --- text.
3.  Instagram Story Proof --- upload gambar.
4.  Instagram Comment Proof --- upload gambar.
5.  PR / Reference Person --- text.

Persyaratan form: - Semua field wajib diisi. - Instagram username
menerima input dengan atau tanpa `@`, lalu simpan dalam format yang
konsisten. - Pilih event yang ingin didaftarkan. - Upload hanya JPG,
JPEG, PNG, atau WEBP. - Batas ukuran file awal: 5 MB per gambar, dapat
dikonfigurasi. - Tampilkan preview gambar sebelum submit. - Tampilkan
progress/loading saat upload. - Validasi file di client dan server. -
Berikan pesan error yang jelas. - Cegah double submission. - Setelah
berhasil, tampilkan halaman/pesan konfirmasi bahwa pendaftaran diterima
dan berstatus PENDING. - Jangan menyatakan guestlist sudah approved
sebelum admin menyetujuinya. - Tambahkan privacy notice singkat bahwa
bukti hanya digunakan untuk verifikasi guestlist. - Jangan tampilkan
data pendaftar lain kepada pengunjung.

Sediakan UX yang baik untuk mobile, termasuk upload dari galeri atau
kamera jika browser mendukung.

## 5. RSVP WHATSAPP

Setiap event memiliki nomor WhatsApp RSVP sendiri atau menggunakan nomor
default yang dapat diatur.

Tombol RSVP membuka WhatsApp dengan pesan otomatis yang sudah
di-URL-encode. Contoh pesan:

"Hi LOUD JAKARTA! I would like to RSVP for \[EVENT NAME\]. Please
provide me with more information."

Gunakan format nomor internasional tanpa tanda plus, spasi, atau strip
pada URL `wa.me`, misalnya `https://wa.me/628XXXXXXXXXX?text=...`.

Nomor WhatsApp harus berasal dari konfigurasi event atau konfigurasi
website, bukan di-hardcode di banyak tempat. Jika nomor belum diatur,
tampilkan fallback yang informatif dan jangan membuat link palsu.

## 6. ADMIN DASHBOARD

Buat area admin yang terlindungi login.

### A. Admin login `/admin/login`

-   Login menggunakan Supabase Auth.
-   Jangan membuat sistem password sendiri.
-   Lindungi semua halaman admin dan endpoint admin.
-   Redirect user yang belum login ke halaman login.
-   Sediakan logout.

### B. Dashboard `/admin`

Tampilkan ringkasan: - Total event. - Total pendaftar. - Pending. -
Approved. - Rejected.

### C. Event management `/admin/events`

Admin yang berwenang dapat: - Membuat event. - Mengedit event. -
Mengaktifkan / menonaktifkan event. - Menghapus atau mengarsipkan event
dengan aman. - Mengunggah flyer. - Mengatur nama event, tanggal, venue,
nomor WhatsApp, status pendaftaran, dan status publikasi. - Melihat
preview flyer.

### D. Guestlist management `/admin/guestlist`

Tampilkan tabel dengan: - Nama. - Instagram. - Event. - PR /
Reference. - Waktu pendaftaran. - Status.

Fitur: - Search nama atau Instagram. - Filter event. - Filter status. -
Sort berdasarkan tanggal pendaftaran. - Pagination. - Buka detail
pendaftar. - Preview Story Proof dan Comment Proof. - Approve. -
Reject. - Catatan internal admin opsional. - Export CSV dengan filter
yang sedang aktif.

Saat admin approve/reject: - Minta konfirmasi sebelum perubahan
status. - Simpan siapa admin yang melakukan tindakan dan kapan tindakan
dilakukan. - Tampilkan feedback berhasil/gagal. - Jangan mengirim
notifikasi WhatsApp otomatis kecuali fitur tersebut memang sudah
dikonfigurasi dan diimplementasikan secara resmi.

### E. Role dan izin

Rancang role minimal: - `super_admin`: seluruh akses. - `staff`: akses
operasional sesuai izin yang diberikan.

Jika role staff belum diperlukan untuk MVP, tetap buat struktur yang
mudah diperluas. Jangan mengandalkan pemeriksaan role di frontend saja;
verifikasi izin di server dan database.

## 7. DATABASE

Rancang schema Supabase dengan tabel minimal berikut.

### `events`

-   `id`: UUID primary key.
-   `name`: text not null.
-   `slug`: text unique, bila digunakan.
-   `description`: text nullable.
-   `flyer_path`: text nullable.
-   `event_date`: timestamptz atau date sesuai kebutuhan.
-   `venue`: text nullable.
-   `whatsapp_number`: text nullable.
-   `registration_open`: boolean default true.
-   `is_published`: boolean default false.
-   `created_at`: timestamptz default now().
-   `updated_at`: timestamptz.

### `guestlist`

-   `id`: UUID primary key.
-   `event_id`: UUID foreign key ke events.
-   `full_name`: text not null.
-   `instagram`: text not null.
-   `story_proof_path`: text not null.
-   `comment_proof_path`: text not null.
-   `reference_person`: text not null.
-   `status`: enum atau constrained text: pending, approved, rejected.
-   `admin_note`: text nullable.
-   `reviewed_by`: UUID nullable, referensi admin.
-   `reviewed_at`: timestamptz nullable.
-   `created_at`: timestamptz default now().

### `admin_profiles`

-   `id`: UUID primary key yang terhubung ke `auth.users`.
-   `display_name`: text nullable.
-   `role`: super_admin atau staff.
-   `created_at`: timestamptz default now().

Buat migration SQL yang bisa dijalankan di Supabase. Sertakan index yang
relevan, foreign key, constraints, dan trigger `updated_at` jika
diperlukan.

Pertimbangkan duplicate submission. Rancang kebijakan yang wajar,
misalnya mencegah pendaftaran berulang untuk event yang sama berdasarkan
Instagram, tetapi dokumentasikan konsekuensi dan cara admin menangani
kasus khusus. Jangan membuat unique constraint yang menghalangi
kebutuhan operasional tanpa penjelasan.

## 8. SECURITY --- WAJIB

Keamanan adalah persyaratan utama, bukan tambahan.

-   Aktifkan Row Level Security (RLS) pada semua tabel yang dapat
    diakses melalui Supabase client.
-   Jangan pernah mengekspos Supabase service role key di browser,
    client bundle, atau variabel `NEXT_PUBLIC_*`.
-   Gunakan secret key hanya di server-side environment.
-   Buat server-side route/action untuk menerima dan memvalidasi
    submission.
-   Public hanya boleh membuat submission melalui alur yang tervalidasi.
-   Public tidak boleh membaca seluruh guestlist atau bukti pendaftar.
-   Hanya admin berwenang yang boleh membaca data guestlist, mengakses
    bukti, dan mengubah status.
-   Gunakan private Storage bucket untuk bukti guestlist.
-   Gunakan signed URL berumur pendek untuk preview bukti oleh admin.
-   Validasi MIME type, ekstensi, ukuran, dan konten file sejauh
    memungkinkan.
-   Gunakan nama/path file acak; jangan menggunakan nama file asli
    sebagai satu-satunya identifier.
-   Cegah path traversal dan akses file lintas pengguna.
-   Terapkan rate limiting atau proteksi spam pada submission.
-   Pertimbangkan CAPTCHA/Turnstile jika spam menjadi masalah.
-   Hindari menampilkan error internal, stack trace, atau secret kepada
    pengguna.
-   Jangan mencatat isi bukti atau informasi sensitif ke log.
-   Terapkan validasi input server-side.
-   Tambahkan security headers yang sesuai.
-   Pastikan akses admin diperiksa di server, bukan hanya dengan
    menyembunyikan menu.

Buat kebijakan RLS dan Storage policies secara eksplisit, sertakan
penjelasan singkat tentang siapa yang boleh melakukan setiap operasi.
Jangan mengklaim sistem aman jika policy belum dibuat dan diuji.

## 9. STORAGE

Gunakan Supabase Storage dengan bucket terpisah jika sesuai:

-   `event-flyers`: flyer event yang memang boleh ditampilkan publik.
-   `guestlist-proofs`: private bucket untuk screenshot Story dan
    Comment.

Aturan: - Flyer dapat dibaca publik jika event dipublikasikan. - Bukti
guestlist harus private. - Upload bukti dilakukan melalui
endpoint/server flow yang tervalidasi atau mekanisme upload terkontrol
dengan policy yang tepat. - Simpan storage path di database, bukan URL
publik permanen. - Admin memperoleh signed URL sementara untuk melihat
gambar. - Jika submission gagal setelah file terunggah, tangani file
orphan dengan cleanup yang aman.

## 10. UX, ACCESSIBILITY, DAN PERFORMANCE

-   Responsive pada mobile, tablet, dan desktop.
-   Gunakan semantic HTML.
-   Form memiliki label yang jelas.
-   Navigasi keyboard dan focus state harus berfungsi.
-   Kontras warna harus memadai.
-   Optimalkan ukuran flyer dan gambar.
-   Gunakan Next.js Image bila sesuai.
-   Lazy-load gambar yang tidak berada di area awal.
-   Hindari animasi yang mengganggu atau menyebabkan motion sickness.
-   Hormati `prefers-reduced-motion`.
-   Sediakan loading, empty, success, dan error states.
-   Gunakan metadata, title, description, Open Graph, dan favicon.
-   Buat halaman 404 yang sesuai brand.

## 11. ENVIRONMENT VARIABLES

Buat `.env.example` dengan placeholder, minimal mencakup variabel yang
benar-benar dipakai aplikasi, seperti:

-   `NEXT_PUBLIC_SUPABASE_URL`
-   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
-   `SUPABASE_SECRET_KEY` (server-only, jika dibutuhkan oleh arsitektur
    yang dipilih)
-   Variabel proteksi spam jika diimplementasikan.

Jangan masukkan nilai secret asli ke repository. Jelaskan variabel mana
yang public dan mana yang server-only. Gunakan nama variabel yang
konsisten di seluruh source code.

## 12. STRUKTUR PROJECT

Gunakan struktur yang rapi dan scalable, misalnya:

``` text
loud-jakarta/
├── public/
│   ├── images/
│   ├── logo/
│   └── fonts/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── guestlist/
│   │   ├── admin/
│   │   └── api/
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── styles/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── .env.example
├── README.md
└── package.json
```

Sesuaikan struktur dengan praktik Next.js yang dipilih. Jangan membuat
folder kosong atau abstraksi berlebihan.

## 13. DELIVERABLES

Hasil akhir harus mencakup:

1.  Source code lengkap.
2.  Homepage public.
3.  Upcoming Events yang mengambil data dari database.
4.  RSVP WhatsApp yang berfungsi.
5.  Guestlist form dengan dua upload bukti.
6.  Supabase database migrations.
7.  RLS policies dan Storage policies.
8.  Admin authentication.
9.  Admin dashboard.
10. Event management.
11. Guestlist review dan approve/reject.
12. CSV export.
13. `.env.example`.
14. README berisi setup lokal.
15. Panduan setup Supabase.
16. Panduan membuat admin pertama dengan aman.
17. Panduan testing.
18. Panduan deployment ke Vercel.
19. Panduan custom domain.
20. Daftar konfigurasi yang masih membutuhkan data asli dari pemilik
    LOUD JAKARTA.

Jangan hanya membuat mockup atau tampilan statis. Semua fitur yang
disebutkan harus benar-benar terhubung dan bekerja, atau diberi label
jelas sebagai belum diimplementasikan.

## 14. CARA BEKERJA --- IKUTI BERTAHAP

Jangan mencoba menghasilkan seluruh aplikasi dalam satu jawaban panjang
yang tidak bisa diuji.

Bekerja secara bertahap:

**PHASE 1 --- Planning** - Konfirmasi asumsi. - Buat sitemap. - Buat
user flow. - Buat database schema. - Buat arsitektur keamanan. - Buat
design system. - Tampilkan rencana implementasi dan risiko.

**PHASE 2 --- Project Setup** - Buat project Next.js. - Setup TypeScript
dan Tailwind. - Setup Supabase client dengan pemisahan browser/server. -
Buat `.env.example`. - Pastikan project berjalan lokal.

**PHASE 3 --- Public Website** - Implementasikan homepage. -
Implementasikan event cards/flyer. - Implementasikan WhatsApp RSVP. -
Implementasikan guestlist form dan upload. - Hubungkan ke database.

**PHASE 4 --- Admin** - Implementasikan login. - Implementasikan
proteksi route. - Implementasikan dashboard. - Implementasikan event
management. - Implementasikan guestlist review dan CSV export.

**PHASE 5 --- Security & QA** - Periksa RLS dan Storage policies. - Uji
akses public dan admin. - Uji upload file valid dan invalid. - Uji
duplicate submission. - Uji mobile responsiveness. - Uji
error/loading/empty states. - Perbaiki bug sebelum lanjut.

**PHASE 6 --- Deployment** - Siapkan GitHub. - Siapkan environment
variables Vercel. - Deploy. - Uji production. - Hubungkan domain. -
Dokumentasikan proses update website.

Di setiap phase: - Sebutkan file yang akan dibuat atau diubah. - Berikan
kode lengkap untuk file yang diminta, bukan potongan yang kehilangan
konteks. - Jelaskan perintah terminal yang harus dijalankan. - Jelaskan
konfigurasi dashboard Supabase/Vercel jika diperlukan. - Jalankan atau
sarankan test/build yang relevan. - Jangan menganggap perintah berhasil
jika belum ada hasilnya. - Berhenti di checkpoint dan minta konfirmasi
sebelum berpindah phase besar. - Jika menemukan error, bantu diagnosis
berdasarkan pesan error aktual. - Jangan menghapus atau menimpa
pekerjaan yang sudah ada tanpa menjelaskan dampaknya.

## 15. INFORMASI YANG MASIH HARUS DIISI PEMILIK

Gunakan placeholder yang jelas untuk data berikut dan jangan
mengarangnya:

-   Logo LOUD JAKARTA.
-   Brand font jika sudah tersedia.
-   Warna accent final.
-   Instagram resmi.
-   Nomor WhatsApp RSVP.
-   Domain final.
-   Flyer event.
-   Nama, tanggal, dan venue event.
-   Daftar PR/reference jika ingin menggunakan pilihan dropdown.
-   Email admin pertama.

Jika daftar PR belum diberikan, gunakan text input untuk Reference
Person agar admin dapat menerima nama PR yang berbeda-beda.

## 16. KRITERIA SELESAI

Website dinyatakan siap launch jika:

-   Homepage tampil baik di mobile dan desktop.
-   Event aktif tampil dari database.
-   Tombol RSVP membuka WhatsApp dengan nomor dan pesan yang benar.
-   Pengunjung dapat mengirim guestlist dengan dua bukti gambar.
-   Submission tersimpan dan berstatus pending.
-   Pengunjung tidak dapat membaca data atau bukti orang lain.
-   Admin dapat login.
-   Admin dapat mengelola event.
-   Admin dapat melihat bukti melalui akses sementara yang aman.
-   Admin dapat approve/reject pendaftar.
-   CSV export berfungsi dan hanya dapat digunakan admin.
-   RLS dan Storage policies telah diuji.
-   Build production berhasil.
-   Deployment Vercel berhasil.
-   README dan panduan operasional tersedia.

------------------------------------------------------------------------

## INSTRUKSI PERTAMA UNTUK AI CODING ASSISTANT

Mulai dari **PHASE 1 --- Planning**. Jangan langsung membuat semua kode.

Pertama, berikan: 1. Sitemap dan struktur halaman. 2. User flow
pengunjung dan admin. 3. Rancangan database dan relasi. 4. Rancangan
keamanan RLS dan Storage. 5. Design system LOUD JAKARTA. 6. Rencana
pengerjaan berurutan.

Setelah itu, tunggu persetujuan saya sebelum mulai PHASE 2.

Ingat: tujuan akhirnya adalah website LOUD JAKARTA yang benar-benar
berfungsi dan siap digunakan untuk operasional event, bukan sekadar
visual demo.
