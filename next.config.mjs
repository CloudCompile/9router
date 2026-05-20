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

  // Incremental Static Regeneration for better performance
  experimental: {
    isrMemoryCacheSize: 50 * 1024 * 1024, // 50MB ISR cache
    dynamicIO: true, // Allow dynamic I/O in static pages
  },

  // Optimize headers and redirects
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=300' },
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
