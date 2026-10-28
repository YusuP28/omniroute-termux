 # OmniRoute di Termux (Android ARM64)

Repositori ini adalah fork dari OmniRoute yang telah dimodifikasi agar dapat berjalan di lingkungan Termux (Android). 

## Modifikasi yang Dilakukan:
1. Mengubah script `build` di `package.json` menjadi `next build --webpack` untuk menghindari error Turbopack yang tidak didukung di Android.
2. Mengabaikan dependensi `keytar` (karena Android tidak memiliki `libsecret`).
3. Menggunakan flag `NODE_OPTIONS="--max-old-space-size=4096"` saat build untuk mencegah error *Out of Memory* (OOM).

## Panduan Instalasi di Termux:
1. Instal dependensi dasar:
   `pkg install nodejs python build-essential git -y`
2. Clone repositori ini dan masuk ke foldernya.
3. Instal dependensi Node.js (abaikan script otomatis):
   `npm install --ignore-scripts --force`
4. Kompilasi database SQLite secara manual untuk Android:
   `cd node_modules/better-sqlite3 && npx node-gyp rebuild && cd ../..`
5. Lakukan build aplikasi dengan memori yang cukup:
   `NODE_OPTIONS="--max-old-space-size=4096" npm run build`
6. Jalankan OmniRoute:
   `npm run start`
7. Buka browser di HP dan akses `http://localhost:20128`.
