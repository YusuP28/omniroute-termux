#!/usr/bin/env bash
# =============================================================================
# OmniRoute Termux (Android ARM64) Automated Installer
# =============================================================================
# This script automates the full installation and build of OmniRoute on Termux.
# Run with: bash install-termux.sh
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step() { echo -e "\n${CYAN}==== $* ====${NC}\n"; }

# Trap errors
trap 'log_error "Installation failed at line $LINENO. Exit code: $?"; exit 1' ERR

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Termux has no reliable /tmp — prefer TMPDIR from Termux ($PREFIX/tmp).
TMP_LOG_DIR="${TMPDIR:-/tmp}"

log_step "OmniRoute Termux Installer Starting"
log_info "Project root: $PROJECT_ROOT"
log_info "Architecture: $(uname -m)"
log_info "Termux version: $(getprop ro.build.version.release 2>/dev/null || echo 'unknown')"

# =============================================================================
# STEP 1: Install System Dependencies
# =============================================================================
log_step "STEP 1: Installing System Dependencies"

# Update package lists
log_info "Updating pkg repositories..."
pkg update -y || { log_error "Failed to update pkg"; exit 1; }

# Install required packages
REQUIRED_PKGS=(
    nodejs-lts      # Node.js LTS (includes npm)
    python          # Python 3 for node-gyp
    build-essential # GCC, make, etc. for native compilation
    git             # Git (if not present)
    clang           # C/C++ compiler
    libc++          # C++ standard library
    libsqlite       # SQLite development headers
    pkg-config      # pkg-config for build
)

log_info "Installing packages: ${REQUIRED_PKGS[*]}"
pkg install -y "${REQUIRED_PKGS[@]}" || { log_error "Failed to install system packages"; exit 1; }

# Verify installations
log_info "Verifying installations..."
node --version && log_success "Node.js: $(node --version)"
npm --version && log_success "npm: $(npm --version)"
python3 --version && log_success "Python: $(python3 --version)"
which gcc && log_success "GCC: $(gcc --version | head -1)"
which make && log_success "Make: $(make --version | head -1)"

# =============================================================================
# STEP 2: Configure npm for Termux
# =============================================================================
log_step "STEP 2: Configuring npm for Termux"

# Set npm prefix to avoid permission issues
NPM_PREFIX="$HOME/.npm-global"
mkdir -p "$NPM_PREFIX"
npm config set prefix "$NPM_PREFIX"
export PATH="$NPM_PREFIX/bin:$PATH"
log_info "npm prefix set to: $NPM_PREFIX"

# Increase npm fetch timeout for slow connections
npm config set fetch-timeout 300000
npm config set fetch-retries 5

# =============================================================================
# STEP 3: Install npm Dependencies (ignore scripts first)
# =============================================================================
log_step "STEP 3: Installing npm Dependencies (--ignore-scripts --force)"

log_info "Running: npm install --ignore-scripts --force"
npm install --ignore-scripts --force || { log_error "npm install failed"; exit 1; }
log_success "npm dependencies installed (scripts skipped)"

# =============================================================================
# STEP 3.5: Disable keytar (requires libsecret — unsupported on Termux)
# =============================================================================
log_step "STEP 3.5: Disabling keytar (libsecret is unavailable on Android/Termux)"

KEYTAR_DIR="$PROJECT_ROOT/node_modules/keytar"
KEYTAR_DISABLED_DIR="$PROJECT_ROOT/node_modules/keytar_disabled"

if [[ -d "$KEYTAR_DIR" ]]; then
    rm -rf "$KEYTAR_DISABLED_DIR"
    mv "$KEYTAR_DIR" "$KEYTAR_DISABLED_DIR"
    log_warn "keytar dinonaktifkan ($KEYTAR_DISABLED_DIR)"
    log_info "OmniRoute akan memakai fallback store terenkripsi (zed-credentials.json)"
elif [[ -d "$KEYTAR_DISABLED_DIR" ]]; then
    log_info "keytar sudah dinonaktifkan sebelumnya (keytar_disabled)"
else
    log_info "keytar tidak terpasang — fallback store terenkripsi akan dipakai"
fi

# =============================================================================
# STEP 4: Manually Compile better-sqlite3 via node-gyp
# =============================================================================
log_step "STEP 4: Compiling better-sqlite3 manually"

BETTER_SQLITE3_DIR="$PROJECT_ROOT/node_modules/better-sqlite3"
if [[ ! -d "$BETTER_SQLITE3_DIR" ]]; then
    log_error "better-sqlite3 not found in node_modules"
    exit 1
fi

cd "$BETTER_SQLITE3_DIR"

# Check if prebuilt binary exists for android-arm64
if [[ -f "lib/binding/napi-v3-android-arm64/node.napi.node" ]] || \
   [[ -f "build/Release/better_sqlite3.node" ]]; then
    log_warn "Prebuilt binary may already exist, but recompiling for safety..."
fi

log_info "Running node-gyp rebuild for better-sqlite3..."
# Use node-gyp directly with proper flags for Android ARM64
npm run build 2>/dev/null || \
node-gyp rebuild \
    --target=$(node -p "process.version.slice(1)") \
    --arch=arm64 \
    --platform=android \
    --libc=glibc \
    2>&1 | tee "${TMP_LOG_DIR}"/better-sqlite3-build.log || {
    log_warn "node-gyp rebuild failed, trying alternative approach..."
    
    # Try with explicit Python and compiler
    CC=clang CXX=clang++ node-gyp rebuild \
        --target=$(node -p "process.version.slice(1)") \
        --arch=arm64 \
        --platform=android \
        2>&1 | tee -a ${TMP_LOG_DIR}/better-sqlite3-build.log
} || { log_error "better-sqlite3 compilation failed. Check ${TMP_LOG_DIR}/better-sqlite3-build.log"; exit 1; }

# Verify the compiled binary
if [[ -f "build/Release/better_sqlite3.node" ]] || \
   [[ -f "lib/binding/napi-v3-android-arm64/node.napi.node" ]]; then
    log_success "better-sqlite3 compiled successfully"
else
    log_error "Compiled binary not found after build"
    exit 1
fi

cd "$PROJECT_ROOT"

# =============================================================================
# STEP 5: Compile other native dependencies (if any)
# =============================================================================
log_step "STEP 5: Compiling other native dependencies"

NATIVE_PKGS=("@swc/core" "better-sqlite3")
for pkg in "${NATIVE_PKGS[@]}"; do
    PKG_DIR="$PROJECT_ROOT/node_modules/$pkg"
    if [[ -d "$PKG_DIR" && -f "$PKG_DIR/binding.gyp" ]]; then
        log_info "Compiling $pkg..."
        cd "$PKG_DIR"
        npm run build 2>/dev/null || \
        node-gyp rebuild \
            --target=$(node -p "process.version.slice(1)") \
            --arch=arm64 \
            --platform=android \
            2>&1 | tee "${TMP_LOG_DIR}/$pkg-build.log" || log_warn "$pkg compilation had issues (may have prebuilt)"
        cd "$PROJECT_ROOT"
    fi
done
log_success "Native dependencies handled"

# =============================================================================
# STEP 6: Run Postinstall Scripts
# =============================================================================
log_step "STEP 6: Running postinstall scripts"

log_info "Running: npm run postinstall"
npm run postinstall || { log_error "postinstall script failed"; exit 1; }
log_success "Postinstall completed"

# =============================================================================
# STEP 7: Build Next.js Application with Webpack
# =============================================================================
log_step "STEP 7: Building Next.js Application (webpack mode)"

# Set memory limit for Node.js to prevent OOM on Android
export NODE_OPTIONS="--max-old-space-size=4096"
log_info "NODE_OPTIONS set to: $NODE_OPTIONS"

# Ensure we use webpack (not turbopack) for better compatibility
log_info "Running: next build --webpack"
npm run build 2>&1 | tee "${TMP_LOG_DIR}/next-build.log" || {
    log_error "Next.js build failed. Check ${TMP_LOG_DIR}/next-build.log"
    exit 1
}
log_success "Next.js production build completed"

# =============================================================================
# STEP 8: Verify Build Output
# =============================================================================
log_step "STEP 8: Verifying Build Output"

STANDALONE_DIR="$PROJECT_ROOT/.next/standalone"
if [[ -d "$STANDALONE_DIR" && -f "$STANDALONE_DIR/server.js" ]]; then
    log_success "Standalone output verified at: $STANDALONE_DIR"
    log_info "Server entry: $STANDALONE_DIR/server.js"
else
    log_error "Standalone build output not found"
    exit 1
fi

# =============================================================================
# STEP 9: Build Electron App (Optional - skip if not needed)
# =============================================================================
log_step "STEP 9: Electron Build Preparation (Optional)"

if [[ -f "$PROJECT_ROOT/electron/package.json" ]]; then
    log_info "Electron config found. To build desktop app later, run:"
    log_info "  cd electron && npm run build"
    log_info "  (This requires additional disk space and time)"
else
    log_warn "Electron directory not found, skipping"
fi

# =============================================================================
# STEP 10: Create Convenience Scripts
# =============================================================================
log_step "STEP 10: Creating convenience scripts"

# Create start script
cat > "$PROJECT_ROOT/start-termux.sh" << 'EOF'
#!/usr/bin/env bash
# Start OmniRoute in production mode on Termux
cd "$(dirname "$0")"
export NODE_OPTIONS="--max-old-space-size=4096"
export DATA_DIR="${DATA_DIR:-$HOME/.omniroute}"
mkdir -p "$DATA_DIR"
exec node .next/standalone/server.js
EOF
chmod +x "$PROJECT_ROOT/start-termux.sh"
log_success "Created start-termux.sh"

# Create dev script
cat > "$PROJECT_ROOT/dev-termux.sh" << 'EOF'
#!/usr/bin/env bash
# Start OmniRoute in development mode on Termux
cd "$(dirname "$0")"
export NODE_OPTIONS="--max-old-space-size=4096"
export DATA_DIR="${DATA_DIR:-$HOME/.omniroute}"
mkdir -p "$DATA_DIR"
exec node scripts/run-next.mjs dev
EOF
chmod +x "$PROJECT_ROOT/dev-termux.sh"
log_success "Created dev-termux.sh"

# =============================================================================
# COMPLETION
# =============================================================================
log_step "INSTALLATION COMPLETE! 🎉"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  OmniRoute successfully installed!     ${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo -e "${CYAN}Next steps:${NC}"
echo -e "  ${YELLOW}Start production:${NC} ./start-termux.sh"
echo -e "  ${YELLOW}Start development:${NC} ./dev-termux.sh"
echo -e "  ${YELLOW}Build Electron app:${NC} cd electron && npm run build"
echo
echo -e "${CYAN}Important notes:${NC}"
echo -e "  • Data directory: ${YELLOW}\$HOME/.omniroute${NC} (configurable via DATA_DIR)"
echo -e "  • Node memory limit: ${YELLOW}4GB${NC} (via NODE_OPTIONS)"
echo -e "  • Webpack mode used for build (not Turbopack)"
echo -e "  • better-sqlite3 compiled natively for Android ARM64"
echo
echo -e "${CYAN}Access the dashboard at:${NC} ${YELLOW}http://localhost:20128${NC}"
echo -e "${CYAN}API endpoint at:${NC} ${YELLOW}http://localhost:20128/api/v1${NC}"
echo
log_success "Happy routing! 🚀"