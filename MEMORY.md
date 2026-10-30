# PROJECT MEMORY & DECISIONS LOG

> File ini berisi catatan permanen tentang arsitektur, perbaikan bug krusial, dan keputusan desain.
> AI WAJIB membaca file ini sebelum bekerja, dan menambahkan catatan baru setiap kali menyelesaikan tugas besar.

## 1. Environment Constraints (Termux/Android)

- Runtime di Termux/Android ARM64 memakai Node.js 24.22.1; `package.json` mengizinkan Node `>=18 <25`.
- Build wajib memakai Webpack (`next build --webpack`); Turbopack tidak memiliki binary Android ARM64.
- `better-sqlite3` tidak punya prebuilt Android; wajib di-rebuild lewat `scripts/android/rebuild-better-sqlite3.sh` setelah `npm install` atau pergantian versi Node.
- `keytar` tidak tersedia (tanpa libsecret); kredensial Zed memakai store JSON terenkripsi AES-256-GCM (`zed-credentials.json` + `zed-credentials.key`).
- Auto-update dinonaktifkan di Android dan saat `OMNIROUTE_DISABLE_AUTO_UPDATE=1`.
- Docker dan Electron desktop tidak didukung di Termux; gunakan dashboard web.
- Server persisten dijalankan lewat `tmux` dengan socket eksplisit dan `termux-wake-lock`; wake lock tidak bertahan setelah reboot.

## 2. Architecture & Design Decisions

- Fork `YusuP28/omniroute-termux` mempertahankan encrypted credential store dari upstream `main`, bukan store JSON plaintext.
- Build Android memakai Webpack dan alias `next.config.mjs` untuk `@swc/core` serta `@next/swc-wasm-nodejs`.
- Perintah MCP lokal memakai `npm run mcp` (`node bin/omniroute.mjs --mcp`), bukan CLI global `omniroute`.
- Dokumentasi fork membedakan link upstream (npm/Docker/website/WhatsApp) dari link fork.
- Versi fork: `3.8.52`.

## 3. Crucial Bug Fixes

- `better_sqlite3.node` gagal dimuat setelah install atau pergantian Node → rebuild native module dengan script Android.
- `EBADPLATFORM ... wreq-js` → gunakan `npm install --ignore-scripts --force`; `wreq-js` bersifat opsional.
- `next build` gagal karena Turbopack/SWC Android → gunakan `--webpack` dan alias WASM.
- Heap out of memory saat build → set `NODE_OPTIONS="--max-old-space-size=4096"`.
- Banner auto-update muncul di dashboard Android → guard `isAutoUpdateDisabled`, hapus banner, dan endpoint `POST /api/system/version` mengembalikan HTTP 403.
- `keytar` crash di Termux → fallback ke encrypted JSON store.

## 4. Build & Verification Log

- **2026-10-29 — Build v3.8.52**: `BUILD_EXIT=0`, `BUILD_ID=kIYNO3PPYIjPk7Nc-fqcH`, 224/224 static pages. Warning non-fatal: webpack cache snapshot, critical dependency `src/app/api/system/env/repair/route.ts`, dan `keytar` tidak ditemukan (memang diharapkan karena fallback). Log: `/data/data/com.termux/files/usr/tmp/opencode/build-guard-3.8.52.log`.
- **2026-10-29 — Server**: berjalan di port `20128`; `/login` dan `/docs` HTTP 200; `/api/system/version` melaporkan `3.8.52`, `updateAvailable: false`, `autoUpdateSupported: false`.
- **2026-10-29 — Dokumentasi**: README dan `docs/ANDROID-TERMUX.md` diselaraskan dengan fork (Node 24, `npm run mcp`, link fork/upstream, catatan Docker/Electron, guard auto-update, tmux + wake-lock).
- **2026-10-29 — Memory protocol**: `MEMORY.md` dibuat dan protokol Long-Term Memory ditambahkan ke `AGENTS.md`; perubahan ini masih lokal dan belum di-commit.
- **2026-10-30 — Feature: Multi‑Select Model UI**: Added UI components for selecting multiple models in `ModelSelectModal`, including "Test All Models", "Select All Working", per‑model checkboxes, hide‑failing toggle, progress bar, selection summary, and `maxSelections` support. Updated `ModelSelectModal.propTypes` with `multiSelect`, `onSelectMultiple`, and `maxSelections`. Updated combo page to pass `multiSelect={true}`. Verified no TypeScript errors and UI functional.
