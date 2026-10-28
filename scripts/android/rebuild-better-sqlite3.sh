#!/data/data/com.termux/files/usr/bin/bash
#
# Rebuild better-sqlite3 from source for Termux / Android ARM64.
#
# The npm registry ships prebuilt binaries for linux-x64 / darwin / win32 only.
# Termux reports process.platform === "android", so npm falls back to a source
# build (or downloads a linux-x64 binary that cannot be dlopen'd). This script
# builds against the Node headers bundled with Termux's node package.
#
# Usage:
#   bash scripts/android/rebuild-better-sqlite3.sh
#   bash scripts/android/rebuild-better-sqlite3.sh --skip-deps
#
set -euo pipefail

SKIP_DEPS=0
for arg in "$@"; do
  case "$arg" in
    --skip-deps) SKIP_DEPS=1 ;;
    -h | --help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

if [ -z "${PREFIX:-}" ] || [ ! -d "$PREFIX" ]; then
  echo "ERROR: This script must run inside Termux (PREFIX is not set)." >&2
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

if [ "$SKIP_DEPS" -eq 0 ]; then
  echo "==> Installing build dependencies (python, clang, make, binutils, pkg-config)"
  pkg install -y python clang make binutils pkg-config
fi

echo "==> Platform: $(uname -s) $(uname -m) | Node: $(node -v) | npm: $(npm -v)"

if [ ! -d "node_modules/better-sqlite3" ]; then
  echo "==> better-sqlite3 is not installed; installing dependencies without scripts"
  # --force is required on Android: some dependencies (e.g. wreq-js) declare
  # os: darwin/linux/win32, which npm treats as EBADPLATFORM. The app falls back
  # gracefully at runtime when their native binaries cannot be loaded.
  npm install --ignore-scripts --force --no-audit --no-fund
fi

# ── Toolchain / headers ─────────────────────────────────────────────────────
export CC="${CC:-clang}"
export CXX="${CXX:-clang++}"
export CFLAGS="${CFLAGS:--O2 -fPIC}"
export CXXFLAGS="${CXXFLAGS:--O2 -fPIC}"
export LDFLAGS="${LDFLAGS:--L$PREFIX/lib}"

# Termux ships node headers + common.gypi in $PREFIX/include/node.
export npm_config_nodedir="$PREFIX"
export npm_config_build_from_source=true
export npm_config_python="${npm_config_python:-$(command -v python3)}"

PYTHON_BIN="$(command -v python3 || true)"
if [ -z "$PYTHON_BIN" ]; then
  echo "ERROR: python3 not found. Run: pkg install python" >&2
  exit 1
fi

NODE_GYP_JS="$PREFIX/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js"
if [ ! -f "$NODE_GYP_JS" ]; then
  NODE_GYP_JS="$(npm root -g)/npm/node_modules/node-gyp/bin/node-gyp.js"
fi
if [ ! -f "$NODE_GYP_JS" ]; then
  echo "ERROR: node-gyp not found. Reinstall npm: pkg install nodejs-lts" >&2
  exit 1
fi

# ── Build ───────────────────────────────────────────────────────────────────
echo "==> Cleaning previous build artifacts"
rm -rf node_modules/better-sqlite3/build

echo "==> Building better-sqlite3 (Release, arm64)"
(
  cd node_modules/better-sqlite3
  node "$NODE_GYP_JS" rebuild \
    --nodedir="$PREFIX" \
    --python="$PYTHON_BIN" \
    --verbose
)

BINARY="node_modules/better-sqlite3/build/Release/better_sqlite3.node"
if [ ! -f "$BINARY" ]; then
  echo "ERROR: build finished but $BINARY is missing." >&2
  exit 1
fi

# ── Smoke test ──────────────────────────────────────────────────────────────
echo "==> Smoke test"
node -e '
const Database = require("better-sqlite3");
const db = new Database(":memory:");
db.exec("CREATE TABLE t (x INTEGER)");
db.prepare("INSERT INTO t VALUES (?)").run(42);
const row = db.prepare("SELECT x FROM t").get();
db.close();
if (!row || row.x !== 42) throw new Error("unexpected result: " + JSON.stringify(row));
console.log("better-sqlite3 OK — ABI", process.versions.modules, "on", process.platform, process.arch);
'

echo "==> Done. If the app was already running, restart it."
