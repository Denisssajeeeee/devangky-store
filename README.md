# Devangky Store

Toko digital berbasis HTML, CSS, JavaScript ES Modules, dan Firebase modular SDK v10.12.2.

## Struktur folder
- `public/`: seluruh frontend static yang dipublikasikan oleh Firebase Hosting/Netlify/Cloudflare Pages.
- `public/assets/css/`: stylesheet.
- `public/assets/js/`: konfigurasi Firebase, modul bersama `common.js`, dan modul per halaman.
- `public/assets/img/`: logo dan gambar QRIS.
- `backend/`: konfigurasi Firebase yang tidak disajikan sebagai aset frontend: Firestore rules/indexes, Storage rules, dan placeholder Cloud Functions.

## Setup Firebase
1. Buat project di Firebase Console dan daftarkan Web App.
2. Aktifkan Authentication (Email/Password dan, bila diperlukan, Google) serta Firestore Database.
3. Salin konfigurasi Web App ke `public/assets/js/firebase-config.js`.
4. Ganti `ISI_PROJECT_ID` di `.firebaserc`.
5. Deploy rules dan hosting dengan Firebase CLI (`firebase login`, `firebase use`, lalu `firebase deploy`).

## Ganti nomor WhatsApp dan nama QRIS
Edit `DEFAULT_SETTINGS` pada `public/assets/js/firebase-config.js`:
- `waNumber`: nomor WhatsApp format internasional, awali `62` tanpa `+` atau `0`.
- `qrisName`: nama pemilik QRIS yang ditampilkan pada halaman pembayaran.

## Ganti gambar QRIS
Ganti placeholder `public/assets/img/qr.png.txt` dengan gambar QRIS bernama `qr.png` pada folder yang sama. Pastikan file gambar benar-benar bernama `qr.png`.

## Membuat admin
Setelah akun dibuat, buka Firestore collection `users`, pilih dokumen dengan ID UID pengguna, lalu ubah/tambahkan field `role` bertipe string menjadi `admin`. Jangan memberikan akses admin kepada akun yang tidak dipercaya.

## Edit produk
Login dengan akun admin, buka Admin Panel, lalu gunakan fitur tambah/edit/nonaktifkan produk. Produk disimpan pada collection `products`. Jika collection masih kosong atau tidak dapat dibaca, katalog menggunakan `DEFAULT_PRODUCTS` dari konfigurasi.

## Deploy
- Firebase Hosting: `firebase deploy`
- Netlify: publish directory = `public`, build command kosong.
- Cloudflare Pages: build output directory = `public`.

## Test lokal
- Firebase CLI: `firebase serve` (atau `firebase emulators:start` untuk emulator).
- VS Code Live Server: buka folder `public/` sebagai root.

## Catatan keamanan
Rules Firestore adalah baseline. Sebelum produksi, uji rules di Firebase Rules Playground/Emulator, aktifkan App Check jika sesuai, dan jangan pernah menaruh service-account key di folder `public/`.

Catatan: halaman `testimoni.html` berisi konten contoh untuk memperlihatkan tata letak. Ganti nama, kutipan, dan rating dengan ulasan pelanggan asli sebelum dipublikasikan.
