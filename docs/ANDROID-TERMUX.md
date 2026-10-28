# Running OmniRoute on Android / Termux (ARM64)

This guide covers the Android-specific differences from the normal Linux
install. The project itself is unchanged for Linux/macOS/Windows.

## What is different on Android?

| Area                    | Change                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Bundler                 | Turbopack has no Android ARM64 binaries, so the build uses **Webpack** (`next build --webpack`).                                          |
| `keytar`                | Not supported (no libsecret). Zed credentials use an AES-256-GCM encrypted JSON store (`zed-credentials.json` + `zed-credentials.key`).   |
| `better-sqlite3`        | No prebuilt Android binary — it must be compiled with `node-gyp` against Termux's Node headers.                                           |
| Auto-update             | Disabled automatically on Android (`process.platform === "android"`) and when `OMNIROUTE_DISABLE_AUTO_UPDATE=1` is set.                   |
| `@swc/core`             | No Android binary. `next-intl/plugin` statically imports it, so the equivalent Webpack alias is configured directly in `next.config.mjs`. |
| `@next/swc-wasm-nodejs` | WASM fallback for Next.js' compiler (no native `@next/swc-android-arm64` for Next 16).                                                    |
| `wreq-js`               | Declares `os: darwin/linux/win32`. It is optional; the HTTP client falls back when it cannot load.                                        |

## Prerequisites

```bash
pkg update
pkg install -y nodejs python clang make binutils pkg-config git
node -v   # Node >= 18 and < 25 (tested with Node 24.22.1)
```

Native modules are compiled against the Node ABI. If you switch Node versions,
rebuild `better-sqlite3` afterwards. `nodejs-lts` (Node 22) also works if you
prefer an LTS release.

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

## 5. Keep the server alive on Android

Android may suspend Termux when the screen is off. Acquire a wake lock and run
the server inside `tmux`:

```bash
pkg install -y tmux
termux-wake-lock

export TMUX_SOCK="${TMPDIR:-$PREFIX/tmp}/omniroute-tmux.sock"
export APP_DIR="$HOME/omniroute-termux"   # adjust to your clone path
tmux -S "$TMUX_SOCK" new-session -d -s omniroute \
  "cd \"$APP_DIR\" && NODE_OPTIONS=--max-old-space-size=4096 npm run start"

# Re-attach later
tmux -S "$TMUX_SOCK" attach -t omniroute
```

Detach with `Ctrl-b` then `d`. The wake lock does **not** survive a reboot; run
`termux-wake-lock` again after restarting the device. See
[Termux services](https://wiki.termux.com/wiki/Termux-services) if you want
automatic startup.

## Auto-update guard

In-app auto-update is disabled automatically on Android
(`process.platform === "android"`). It can also be force-disabled on any
platform with `OMNIROUTE_DISABLE_AUTO_UPDATE=1`:

```bash
echo 'OMNIROUTE_DISABLE_AUTO_UPDATE=1' >> ~/.omniroute/server.env
```

`GET /api/system/version` then reports `autoUpdateSupported: false`, and
`POST /api/system/version` returns HTTP 403.

## Zed credentials without keytar

`src/lib/zed-oauth/credential-store.ts` tries `keytar` first and falls back to
an AES-256-GCM encrypted JSON file when `keytar` is unavailable (the normal case
on Android):

```
$DATA_DIR/zed-credentials.json      # encrypted store, default: ~/.omniroute/
$DATA_DIR/zed-credentials.key       # 32-byte base64 key, mode 0600
```

Both paths follow `DATA_DIR`; there is no separate credentials-file override.
The store is written atomically with mode `0600`. Missing or malformed files are
treated as "no credentials"; the app never fails to boot because of it.

Format (new values use the encrypted envelope; legacy plaintext values remain readable):

```json
{
  "version": 1,
  "updatedAt": "2026-10-29T00:00:00.000Z",
  "services": {
    "zed-openai": {
      "api-key": "enc:v1:<iv-base64url>:<ciphertext-base64url>:<tag-base64url>"
    }
  }
}
```

`service` must match one of the Zed service patterns (`zed-openai`,
`ai.zed.anthropic`, `zed-google`, ...). The account key is the credential name
(for example `api-key`). Legacy plaintext values inside `services` (without the
`enc:v1:` prefix) are still readable for backward compatibility.

The import endpoint (`POST /api/providers/zed/import`) reads this store, so no
keychain/libsecret is required.

## Troubleshooting

| Symptom                                                      | Fix                                                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `Could not locate the bindings file ... better_sqlite3.node` | Re-run `bash scripts/android/rebuild-better-sqlite3.sh`.                                                                  |
| `Failed to load native binding` (SWC)                        | Run `npm ci --ignore-scripts` again, or let Next download `@next/swc-wasm-nodejs` to `~/.cache/next-swc` (needs network). |
| `EBADPLATFORM ... wreq-js`                                   | `wreq-js` is optional in `package.json`; refresh the lockfile with `npm install --package-lock-only`.                     |
| JavaScript heap out of memory                                | Keep `NODE_OPTIONS="--max-old-space-size=4096"`.                                                                          |
| Turbopack errors                                             | Turbopack is disabled; make sure you run `next build --webpack` / `npm run dev` (which passes `--webpack`).               |
