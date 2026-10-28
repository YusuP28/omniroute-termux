# Running OmniRoute on Android / Termux (ARM64)

This guide covers the Android-specific differences from the normal Linux
install. The project itself is unchanged for Linux/macOS/Windows.

## What is different on Android?

| Area | Change |
| --- | --- |
| Bundler | Turbopack has no Android ARM64 binaries, so the build uses **Webpack** (`next build --webpack`). |
| `keytar` | Not supported (no libsecret). Zed credential import uses a local JSON store. |
| `better-sqlite3` | No prebuilt Android binary — it must be compiled with `node-gyp` against Termux's Node headers. |
| `@swc/core` | No Android binary. `next-intl/plugin` statically imports it, so the equivalent Webpack alias is configured directly in `next.config.mjs`. |
| `@next/swc-wasm-nodejs` | WASM fallback for Next.js' compiler (no native `@next/swc-android-arm64` for Next 16). |
| `wreq-js` | Declares `os: darwin/linux/win32`. It is optional; the HTTP client falls back when it cannot load. |

## Prerequisites

```bash
pkg update
pkg install -y nodejs-lts python clang make binutils pkg-config git
node -v   # Node >= 18 and < 24 (nodejs-lts is recommended)
```

Native modules are compiled against the Node ABI. If you switch Node versions,
rebuild `better-sqlite3` afterwards.

## 1. Install dependencies without native build scripts

```bash
cd ~/omniroute-v3.8.52
npm ci --ignore-scripts
```

`--ignore-scripts` prevents npm from downloading prebuilt `linux-x64` binaries
that cannot be loaded on Android. If there is no lockfile:

```bash
npm install --ignore-scripts
```

> If you are on an older lockfile that still fails with
> `EBADPLATFORM ... wreq-js`, run `npm install --ignore-scripts --force` once.

## 2. Rebuild better-sqlite3 for Android ARM64

```bash
bash scripts/android/rebuild-better-sqlite3.sh
```

The script installs the toolchain (unless `--skip-deps` is passed), points
`node-gyp` at `$PREFIX/include/node`, compiles against Termux's bionic libc and
runs an in-memory smoke test.

Equivalent manual commands:

```bash
cd node_modules/better-sqlite3
rm -rf build
CC=clang CXX=clang++ \
CFLAGS="-O2 -fPIC" CXXFLAGS="-O2 -fPIC" LDFLAGS="-L$PREFIX/lib" \
node "$PREFIX/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js" rebuild \
  --nodedir="$PREFIX" \
  --python="$(command -v python3)"
```

Re-run this after **every** `npm install` / `npm ci`, because npm replaces the
compiled `build/` directory.

## 3. Build

```bash
NODE_OPTIONS="--max-old-space-size=4096" \
NEXT_TELEMETRY_DISABLED=1 \
npm run build
```

`npm run build` is `next build --webpack`. The Android helper does the same with
the heap flag already set:

```bash
npm run build:android
```

If the repository contains the legacy root `app/` packaging snapshot, use
`npm run build:isolated` instead — it moves that folder aside during the build
and forwards `--webpack`.

## 4. Start

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run start
```

Default dashboard/API port: `20128`. Data lives in `~/.omniroute/` unless
`DATA_DIR` is set.

## Zed credentials without keytar

`src/lib/zed-oauth/credential-store.ts` stores credentials in:

```
$DATA_DIR/zed-credentials.json      # default: ~/.omniroute/zed-credentials.json
```

Override with `OMNIROUTE_ZED_CREDENTIALS_FILE`. The file is written atomically
with mode `0600`. Missing or malformed files are treated as "no credentials";
the app never fails to boot because of it.

Format:

```json
{
  "version": 1,
  "credentials": [
    {
      "service": "zed-openai",
      "account": "api-key",
      "token": "sk-...",
      "provider": "openai"
    }
  ]
}
```

`service` must match one of the Zed service patterns (`zed-openai`,
`ai.zed.anthropic`, `zed-google`, ...). `provider` is optional and inferred from
`service` when omitted.

The import endpoint (`POST /api/providers/zed/import`) reads this store, so no
keychain/libsecret is required.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Could not locate the bindings file ... better_sqlite3.node` | Re-run `bash scripts/android/rebuild-better-sqlite3.sh`. |
| `Failed to load native binding` (SWC) | Run `npm ci --ignore-scripts` again, or let Next download `@next/swc-wasm-nodejs` to `~/.cache/next-swc` (needs network). |
| `EBADPLATFORM ... wreq-js` | `wreq-js` is optional in `package.json`; refresh the lockfile with `npm install --package-lock-only`. |
| JavaScript heap out of memory | Keep `NODE_OPTIONS="--max-old-space-size=4096"`. |
| Turbopack errors | Turbopack is disabled; make sure you run `next build --webpack` / `npm run dev` (which passes `--webpack`). |
