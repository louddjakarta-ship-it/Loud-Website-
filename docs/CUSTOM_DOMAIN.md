# Custom Domain & HTTPS — LOUD JAKARTA

Panduan memasang domain final ke deployment Vercel. Domain belum ditentukan
saat dokumen ini ditulis; ganti `<domain>` dan `<www-domain>` dengan nilai
nyata.

Contoh: `loudjakarta.com` dan `www.loudjakarta.com`.

---

## 1. Sebelum mulai

Siapkan:

- Domain yang sudah dibeli (registrar apa pun: Namecheap, Cloudflare, Niagahoster,
  dsb.).
- Akses DNS registrar/Cloudflare.
- Akses Vercel project (role Owner/Member).
- Deployment production yang sudah sehat di `*.vercel.app`.

Putuskan lebih dulu mana yang jadi alamat utama:

- **Apex** (`https://loudjakarta.com`) — disarankan untuk brand dan link yang
  dibagikan.
- **www** (`https://www.loudjakarta.com`) — redirect ke apex.

Jangan memakai keduanya sebagai canonical; pilih satu agar metadata, sitemap,
dan cookie admin konsisten.

---

## 2. Tambahkan domain di Vercel

1. Vercel Dashboard → project → **Settings → Domains**.
2. Tambahkan `<domain>` (apex).
3. Tambahkan `<www-domain>`.
4. Pilih redirect: `www` → apex (308), atau sebaliknya sesuai keputusan §1.
5. Vercel menampilkan nilai DNS yang harus dibuat. **Pakai nilai yang muncul di
   dashboard**; nilai di bawah adalah default umum dan bisa berubah.

### DNS default Vercel

| Host | Type | Value | Keterangan |
|------|------|-------|------------|
| `@` (apex) | `A` | `76.76.21.21` | Alamat anycast Vercel |
| `www` | `CNAME` | `cname.vercel-dns.com` | Subdomain |

Alternatif: ganti nameserver domain ke nameserver Vercel, lalu kelola DNS dari
dashboard Vercel. Cara ini lebih mudah jika registrar mendukung dan tidak ada
record lain (email, subdomain) yang perlu dipertahankan.

Jika memakai Cloudflare DNS:

- Untuk apex, gunakan record **A** ke alamat Vercel dengan proxy **DNS only**
  (awan abu-abu) saat verifikasi awal.
- Jangan mengaktifkan "Orange cloud" untuk record yang di-proxy Cloudflare
  kecuali paham implikasi ganda proxy (HSTS, header, dan rate limit IP).
- Mode SSL/TLS Cloudflare: **Full (strict)** bila proxy aktif.

---

## 3. Propagasi dan verifikasi DNS

Setelah record dibuat:

```bash
nslookup <domain>
nslookup <www-domain>
```

atau:

```bash
dig +short <domain>
dig +short <www-domain>
```

Harapan: apex mengarah ke alamat Vercel, `www` ke `cname.vercel-dns.com` (atau
IP Vercel setelah resolusi). Propagasi biasanya menit, bisa sampai 24–48 jam
tergantung TTL dan registrar.

Di Vercel → Domains, status harus **Valid Configuration**. Jika masih
`Invalid Configuration`, bandingkan record persis dengan yang ditampilkan
dashboard (terutama apex `A` vs `ALIAS`/`ANAME`).

---

## 4. HTTPS

Vercel menerbitkan sertifikat Let's Encrypt otomatis setelah domain valid.
Tidak ada langkah manual untuk domain yang DNS-nya diarahkan ke Vercel.

Verifikasi:

```bash
curl -sI https://<domain>/ | head -20
curl -sI http://<domain>/ | head -5
```

Harapan:

- `https://` mengembalikan `200`.
- `http://` mengembalikan `308` ke `https://`.
- Sertifikat valid tanpa warning.

`next.config.ts` hanya mengirim
`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` saat
`NODE_ENV=production`. Artinya browser yang sudah pernah membuka domain akan
memaksa HTTPS untuk domain dan seluruh subdomain selama dua tahun.

**Peringatan sebelum mengaktifkan preload:**

- Pastikan **semua** subdomain (mis. `api.<domain>`, `mail.<domain>`) juga
  HTTPS. `includeSubDomains` berlaku untuk semuanya.
- HSTS preload sulit dibatalkan; daftar preload browser butuh waktu berbulan-
  bulan untuk dicabut.
- Jika ragu, untuk launch pertama cukup andalkan HSTS tanpa submit ke
  [hstspreload.org](https://hstspreload.org). Header tetap memaksa HTTPS di
  browser yang sudah pernah berkunjung.

---

## 5. Perbarui aplikasi

### Vercel

1. Settings → Environment Variables → **Production**:
   - `NEXT_PUBLIC_SITE_URL=https://<domain>`
2. **Redeploy** production. `NEXT_PUBLIC_*` ditanam saat build, jadi sekadar
   menyimpan env tidak cukup.

`NEXT_PUBLIC_SITE_URL` dipakai untuk:

- `metadataBase` (Open Graph, canonical);
- `sitemap.xml` dan `robots.txt` (`src/lib/site.ts`);
- link absolut di metadata.

### Supabase Auth

Dashboard Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://<domain>`
- **Redirect URLs**:
  - `https://<domain>/**`
  - `https://www.<domain>/**` (jika www tetap aktif/redirect)
  - `https://<project>.vercel.app/**` (preview; boleh dihapus setelah stabil)

Tanpa ini, login admin bisa gagal atau mengarah ke `localhost`.

### Turnstile (jika dipakai)

Cloudflare Turnstile → widget → **Hostname**: tambahkan `<domain>` dan
`www.<domain>`. Tanpa hostname yang terdaftar, token bisa ditolak.

---

## 6. Smoke test domain

```bash
BASE=https://<domain>

curl -s -o /dev/null -w "%{http_code}\n" $BASE/
curl -s -o /dev/null -w "%{http_code}\n" $BASE/privacy
curl -s -o /dev/null -w "%{http_code}\n" $BASE/halaman-tidak-ada
curl -s -o /dev/null -w "%{http_code}\n" $BASE/admin
curl -sI $BASE/ | grep -Ei "content-security-policy|strict-transport|x-frame"
curl -s $BASE/sitemap.xml | head -20
curl -s $BASE/robots.txt
```

Harapan:

- Homepage `200`, privacy `200`, halaman acak `404`, `/admin` `307`.
- CSP berisi `nonce-...`; HSTS ada; `X-Frame-Options: DENY`.
- `sitemap.xml` memakai `https://<domain>`, bukan `localhost`.
- `robots.txt` mengizinkan crawl dan menunjuk sitemap domain final.

Lalu manual:

- [ ] Login admin berhasil dan cookie sesi bertahan setelah refresh.
- [ ] Copy guestlist link dari `/admin/events` menghasilkan
      `https://<domain>/guestlist/<token>`.
- [ ] Link lama berbasis `*.vercel.app` masih bisa dibuka (path sama), lalu
      ganti dengan link domain final saat mengirim ke tamu.
- [ ] Gambar flyer/gallery tampil (domain Supabase ada di CSP dan
      `next/image`).
- [ ] Tidak ada mixed content di console browser.
- [ ] `www` mengarah ke apex (atau sebaliknya) dengan satu redirect.

---

## 7. Email domain (opsional)

Tidak wajib untuk aplikasi ini karena login admin memakai Supabase Auth dan
tidak mengirim email transaksional dari domain sendiri. Jika nanti memakai
email `halo@<domain>` atau Supabase SMTP kustom:

- Tambahkan record **MX**, **SPF** (`TXT`), dan **DKIM** dari penyedia email.
- Tambahkan **DMARC** (`_dmarc`) setelah SPF/DKIM stabil.
- Jangan mengarahkan nameserver ke Vercel jika record email dikelola di
  registrar; gunakan mode record individual.

---

## 8. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|--------|---------------|--------|
| `Invalid Configuration` di Vercel | Record belum ada / nilai beda / proxy Cloudflare | Samakan dengan nilai dashboard; set DNS only saat verifikasi |
| Sertifikat belum terbit | DNS belum propagasi | Tunggu, cek `dig`, lalu Refresh di Vercel |
| Redirect loop | Redirect Vercel + proxy Cloudflare saling menimpa | Matikan proxy Cloudflare atau set SSL Full (strict) |
| Login admin kembali ke localhost | `NEXT_PUBLIC_SITE_URL` lama / Supabase URL config | Perbaiki env, redeploy, perbarui Site URL Supabase |
| Gambar Supabase tidak tampil | Hostname tidak cocok `next/image` atau CSP | Gunakan `https://*.supabase.co`; cek `next.config.ts` dan CSP |
| `www` tidak redirect | Domain ditambahkan tanpa aturan redirect | Atur redirect di Vercel Domains |
| Sitemap masih `localhost` | Env diubah tanpa redeploy | Redeploy setelah mengubah `NEXT_PUBLIC_SITE_URL` |

---

## 9. Checklist akhir

- [ ] Apex dan `www` terdaftar di Vercel dan valid.
- [ ] Satu canonical, satunya redirect permanen.
- [ ] HTTPS aktif dan `http://` redirect ke `https://`.
- [ ] `NEXT_PUBLIC_SITE_URL` production = domain final, sudah redeploy.
- [ ] Supabase Site URL + Redirect URLs diperbarui.
- [ ] Turnstile hostname diperbarui (jika dipakai).
- [ ] Smoke test §6 lulus.
- [ ] Link guestlist baru dibagikan dari domain final.
- [ ] Catat domain, tanggal, dan pemilik DNS di
      `docs/CONFIGURATION_TODO.md`.
