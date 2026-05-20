import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));
// CLI bundling needs workspace root so tracing includes hoisted node_modules (slim ~50MB).
// Docker / default uses projectRoot so server.js lands at /app/server.js (not nested).
const tracingRoot = process.env.NEXT_TRACING_ROOT_MODE === "workspace"
  ? join(projectRoot, "..")
  : projectRoot;

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  serverExternalPackages: [
    // Database
    "better-sqlite3", "sql.js", "node:sqlite", "bun:sqlite",
    // CSS (only on non-Vercel)
    "lightningcss", "@tailwindcss/postcss", "@tailwindcss/node",
    // Crypto/SSL (optional dependencies)
    "node-forge", "selfsigned"
  ],
  turbopack: {
    root: tracingRoot
  },
  outputFileTracingRoot: tracingRoot,
  outputFileTracingIncludes: {
    // Bundle sql-wasm.wasm into every serverless function so sql.js can load it
    "**": ["./node_modules/sql.js/dist/sql-wasm.wasm", "./public/sql-wasm.wasm"],
  },
  outputFileTracingExcludes: {
    "*": ["./gitbook/**/*", "./cli/**/*", "./tests/**/*"]
  },
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_VERCEL_DEPLOYMENT: process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT || "false"
  },
  poweredByHeader: false,
  compress: true,

  // Optimize headers and rewrites
  headers: async () => [
    // Cache models and providers aggressively
    {
      source: '/api/(v1/)?models',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400' },
        { key: 'CDN-Cache-Control', value: 'public, max-age=86400' },
      ],
    },
    {
      source: '/api/(v1/)?providers',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=1800, s-maxage=43200' },
        { key: 'CDN-Cache-Control', value: 'public, max-age=43200' },
      ],
    },
    // Cache health checks briefly
    {
      source: '/api/health',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=300' },
      ],
    },
    // Default API cache
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=3600' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
    // Security headers for all pages
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
  ],
  webpack: (config, { isServer }) => {
    // Ignore fs/path/crypto modules in browser bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        "lightningcss": false,
        "better-sqlite3": false,
        "sql.js": false,
        "node-forge": false,
        "selfsigned": false,
      };
    }
    // Exclude logs, .next, gitbook subapp from watcher
    config.watchOptions = { ...config.watchOptions, ignored: /[\\/](logs|\.next|gitbook|cli)[\\/]/ };

    // On Vercel, exclude only necessary native modules (but allow CSS processing)
    if (process.env.VERCEL) {
      // Exclude only database/non-CSS native modules from webpack
      const nativeModules = ['better-sqlite3', 'sql.js', 'node-forge'];
      config.externals = config.externals || [];
      if (!Array.isArray(config.externals)) {
        config.externals = [config.externals];
      }
      config.externals.push((ctx, req, cb) => {
        if (nativeModules.some(m => req === m || req.startsWith(m + '/'))) {
          return cb(null, `commonjs ${req}`);
        }
        cb();
      });
    }

    return config;
  },
  async rewrites() {
    return [
      {
        source: "/v1/v1/:path*",
        destination: "/api/v1/:path*"
      },
      {
        source: "/v1/v1",
        destination: "/api/v1"
      },
      {
        source: "/codex/:path*",
        destination: "/api/v1/responses"
      },
      {
        source: "/v1/:path*",
        destination: "/api/v1/:path*"
      },
      {
        source: "/v1",
        destination: "/api/v1"
      }
    ];
  }
};

export default nextConfig;
