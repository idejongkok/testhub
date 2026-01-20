# Deploy TestHub ke Cloudflare Pages

## Langkah-langkah Deploy

**PENTING:** Environment variables harus di-set SEBELUM deployment pertama, atau harus redeploy setelah menambahkan variables.

### 1. Login ke Cloudflare Dashboard
- Buka https://dash.cloudflare.com/
- Login dengan akun Cloudflare Anda
- Pilih menu **Workers & Pages** di sidebar kiri

### 2. Buat Project Baru
- Klik tombol **Create application**
- Pilih tab **Pages**
- Klik **Connect to Git**

### 3. Connect Repository GitHub
- Pilih **GitHub** sebagai Git provider
- Authorize Cloudflare untuk akses GitHub Anda
- Pilih repository: **idejongkok/testhub**
- Klik **Begin setup**

### 4. Configure Build Settings
Gunakan konfigurasi berikut:

```
Project name: testhub (atau nama yang Anda inginkan)
Production branch: master
```

**Build settings:**
- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` (kosongkan)
- Node version: `18` atau lebih tinggi

### 5. Environment Variables
Klik **Add variable** dan tambahkan variabel berikut:

**PENTING:** Tambahkan environment variables ini:

```
VITE_SUPABASE_URL=https://tqncfmyxlztuyixcjwxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxbmNmbXl4bHp0dXlpeGNqd3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxOTAxMDAsImV4cCI6MjA4Mzc2NjEwMH0.upnIkyNYiJke80HF8ZbTrhu4MkarERu-C88bdrNjJZg
```

### 6. Deploy
- Klik **Save and Deploy**
- Tunggu proses build selesai (biasanya 2-5 menit)
- Setelah selesai, Anda akan mendapat URL seperti: `https://testhub.pages.dev`

## Konfigurasi Custom Domain (Opsional)

Jika ingin menggunakan custom domain:

1. Di project settings, klik tab **Custom domains**
2. Klik **Set up a custom domain**
3. Masukkan domain Anda (contoh: `testhub.yourdomain.com`)
4. Ikuti instruksi untuk update DNS records
5. Tunggu SSL certificate diaktifkan (otomatis)

## Automatic Deployments

Setelah setup awal:
- Setiap kali Anda push ke branch `master`, Cloudflare akan otomatis build dan deploy
- Preview deployments dibuat untuk setiap pull request
- Rollback ke deployment sebelumnya bisa dilakukan dengan mudah

## Monitoring & Logs

- Lihat build logs di tab **Deployments**
- Monitor traffic dan analytics di dashboard
- Lihat function logs jika ada error

## Troubleshooting

### Build gagal
- Cek build logs di dashboard
- Pastikan environment variables sudah di-set dengan benar
- Pastikan Node version cukup (minimal 18)

### App tidak bisa akses Supabase
- Verify environment variables di Cloudflare dashboard
- Cek Supabase URL dan API key masih valid
- Pastikan RLS policies di Supabase sudah di-configure

### SPA Routing tidak bekerja
- Cloudflare Pages otomatis handle SPA routing untuk Vite
- Jika masih bermasalah, buat file `public/_redirects`:
  ```
  /*    /index.html   200
  ```

## Next Steps

Setelah deploy berhasil:
1. Test semua fitur aplikasi
2. Setup custom domain (opsional)
3. Configure analytics
4. Setup error tracking (Sentry, LogRocket, dll)

## Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Vite on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite-project/)
- [Environment Variables](https://developers.cloudflare.com/pages/platform/build-configuration/)
