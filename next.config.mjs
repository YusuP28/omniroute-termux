import path from "node:path";

const distDir = process.env.NEXT_DIST_DIR || ".next";

/**
 * Android/Termux migration notes:
 * - Turbopack is disabled in favour of Webpack (`next build --webpack`,
 *   `next dev --webpack`). Turbopack's native binaries are not available for
 *   Android ARM64.
 * - `keytar` is no longer referenced: Zed credential import uses the local
 *   JSON credential store (`src/lib/zed-oauth/credential-store.ts`).
 * - `next-intl/plugin` is intentionally not imported: it statically imports
 *   `@swc/core`, which publishes no Android binary and would crash config
 *   loading. For Webpack the plugin only aliases `next-intl/config` to the
 *   request config, so that alias is applied manually below.
 */

const requestConfigPath = path.resolve(process.cwd(), "src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir,
  output: "standalone",
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "thread-stream",
    "better-sqlite3",
    "wreq-js",
    "zod",
    "child_process",
    "fs",
    "path",
    "os",
    "crypto",
    "net",
    "tls",
    "http",
    "https",
    "stream",
    "buffer",
    "util",
  ],
  transpilePackages: ["@omniroute/open-sse"],
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.*"],
  typescript: {
    // TODO: Re-enable after fixing all sub-component useTranslations scope issues
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer, webpack }) => {
    // Equivalent of what `createNextIntlPlugin` does for Webpack:
    // resolve the abstract `next-intl/config` module to this app's request config.
    config.resolve.alias = {
      ...config.resolve.alias,
      "next-intl/config": requestConfigPath,
    };

    if (isServer) {
      // Webpack resolves the native MITM manager through a build-time stub.
      // (Previously this alias only existed under `turbopack.resolveAlias`.)
      config.resolve.alias = {
        ...config.resolve.alias,
        "@/mitm/manager$": path.resolve(process.cwd(), "src/mitm/manager.stub.ts"),
      };
      // Webpack IgnorePlugin: skip thread-stream test files that contain
      // intentionally broken syntax/imports (they cause build errors)
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /\/test\//,
          contextRegExp: /thread-stream/,
        })
      );
      // ── Next.js 16 module-hash patch (#394, #396, #398) ────────────────────
      //
      // Next.js 16 compiles the instrumentation hook into a separate chunk and
      // emits hashed require() calls such as:
      //   require('better-sqlite3-90e2652d1716b047')
      //   require('zod-dcb22c6336e0bc69')
      //   require('pino-28069d5257187539')
      //
      // These hashed names don't exist in node_modules and cause a 500 at
      // startup on all npm global installs (issues #394, #396, #398).
      //
      // We use two strategies:
      //  1. Exact-name externals for all known server-side packages.
      //  2. Hash-strip catch-all: any require('<name>-<16hexchars>' strips the
      //     suffix and falls through to the real package name.
      //
      const HASH_PATTERN = /^(.+)-[0-9a-f]{16}$/;

      const KNOWN_EXTERNALS = new Set([
        "better-sqlite3",
        "wreq-js",
        "zod",
        "pino",
        "pino-pretty",
        "child_process",
        "fs",
        "path",
        "os",
        "crypto",
        "net",
        "tls",
        "http",
        "https",
        "stream",
        "buffer",
        "util",
      ]);

      const prev = config.externals ?? [];
      const prevArr = Array.isArray(prev) ? prev : [prev];
      config.externals = [
        ...prevArr,
        ({ request }, callback) => {
          // Case 1: Exact known package — treat as external
          if (KNOWN_EXTERNALS.has(request)) {
            return callback(null, `commonjs ${request}`);
          }
          // Case 2: Hash-suffixed name — strip hash, use base name
          // e.g. "better-sqlite3-90e2652d1716b047" → "better-sqlite3"
          //      "zod-dcb22c6336e0bc69"            → "zod"
          const hashMatch = request?.match?.(HASH_PATTERN);
          if (hashMatch) {
            const baseName = hashMatch[1];
            return callback(null, `commonjs ${baseName}`);
          }
          callback();
        },
      ];
    } else {
      // Ignore native Node.js modules in browser bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },

  async rewrites() {
    return [
      {
        source: "/chat/completions",
        destination: "/api/v1/chat/completions",
      },
      {
        source: "/responses",
        destination: "/api/v1/responses",
      },
      {
        source: "/responses/:path*",
        destination: "/api/v1/responses/:path*",
      },
      {
        source: "/models",
        destination: "/api/v1/models",
      },
      {
        source: "/v1/v1/:path*",
        destination: "/api/v1/:path*",
      },
      {
        source: "/v1/v1",
        destination: "/api/v1",
      },
      {
        source: "/codex/:path*",
        destination: "/api/v1/responses",
      },
      {
        source: "/v1/:path*",
        destination: "/api/v1/:path*",
      },
      {
        source: "/v1",
        destination: "/api/v1",
      },
    ];
  },
};

export default nextConfig;
