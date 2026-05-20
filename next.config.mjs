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
  serverExternalPackages: ["better-sqlite3", "sql.js", "node:sqlite", "bun:sqlite"],
  turbopack: {
    root: tracingRoot
  },
  outputFileTracingRoot: tracingRoot,
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
    // Ignore fs/path modules in browser bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    // Exclude logs, .next, gitbook subapp from watcher
    config.watchOptions = { ...config.watchOptions, ignored: /[\\/](logs|\.next|gitbook|cli)[\\/]/ };

    // On Vercel, ensure lightningcss issues don't block build
    if (process.env.VERCEL) {
      config.module.rules.forEach(rule => {
        if (rule.test && rule.test.toString().includes('css')) {
          if (rule.use && Array.isArray(rule.use)) {
            rule.use = rule.use.filter(u => {
              const loader = typeof u === 'string' ? u : u.loader;
              return !loader || !loader.includes('lightningcss');
            });
          }
        }
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
