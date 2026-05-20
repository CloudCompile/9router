// Smart caching headers for Vercel — reduces function invocations

// Cache patterns: [pattern, maxAge, sMaxAge, revalidate]
const CACHE_PATTERNS = [
  // Static data — cache aggressively
  [/^\/api\/(v1\/)?models/, 3600, 86400, "hour"],           // 1h local, 1d edge
  [/^\/api\/(v1\/)?providers(\?|$)/, 1800, 43200, "30min"], // 30m local, 12h edge
  [/^\/api\/pricing/, 3600, 86400, "hour"],
  [/^\/api\/health/, 60, 300, "1min"],

  // Config data — moderate cache
  [/^\/api\/(keys|tags)/, 300, 3600, "5min"],

  // User-specific — short cache
  [/^\/api\/cli-tools/, 60, 300, "1min"],

  // Default: no cache for mutations
];

export function getCacheControl(pathname) {
  for (const [pattern, maxAge, sMaxAge, revalidate] of CACHE_PATTERNS) {
    if (pattern.test(pathname)) {
      return {
        "Cache-Control": `public, max-age=${maxAge}, s-maxage=${sMaxAge}`,
        "CDN-Cache-Control": `public, max-age=${sMaxAge}`,
        revalidate,
      };
    }
  }
  return null;
}

export function applyResponseCaching(response, pathname) {
  const headers = getCacheControl(pathname);
  if (!headers) return response;

  const newResponse = new Response(response.body, response);
  Object.entries(headers).forEach(([key, value]) => {
    if (key !== "revalidate") {
      newResponse.headers.set(key, value);
    }
  });
  return newResponse;
}
