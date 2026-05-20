// Static generation configuration for Vercel
// Pre-builds pages at deploy time for instant delivery

// Routes that should be statically generated (ISR - Incremental Static Regeneration)
export const STATIC_ROUTES = {
  // Landing page - static, revalidate hourly
  '/': {
    revalidate: 3600,
    metadata: { title: 'Fusion - Unlimited FREE AI Coding' }
  },

  // Landing subpages
  '/landing': {
    revalidate: 3600,
  },
};

// API routes that can be pre-cached
export const PRELOAD_ROUTES = [
  '/api/health',
  '/api/v1/models', // Cache initial model list
];

// Export configuration for Next.js
export function getStaticRouteConfig(pathname) {
  return STATIC_ROUTES[pathname] || null;
}

// Helper for components to suggest revalidation
export function withRevalidation(fn, maxAge = 3600) {
  return async function wrapped(...args) {
    try {
      return await fn(...args);
    } finally {
      // Revalidate cache after function runs
      if (typeof process !== 'undefined' && process.env.VERCEL) {
        // Next.js revalidateTag/revalidatePath would be called here in pages/app router
      }
    }
  };
}

// Fetch configuration for optimal caching
export const fetchConfig = {
  next: {
    revalidate: 3600, // 1 hour default cache
    tags: ['api-data'],
  },
};

export function createFetchWithCache(url, options = {}) {
  return fetch(url, {
    ...options,
    next: {
      ...fetchConfig.next,
      ...(options.next || {}),
    },
  });
}
