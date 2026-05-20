// API route optimization utilities for Vercel

// Pagination helper - reduce memory by processing in batches
export async function* paginatedGenerator(items, batchSize = 100) {
  for (let i = 0; i < items.length; i += batchSize) {
    yield items.slice(i, i + batchSize);
    // Allow GC between batches
    await new Promise(resolve => setImmediate(resolve));
  }
}

// Response segmentation - split large responses to avoid function timeout
export function createSegmentedResponse(data, maxSize = 1024 * 100) {
  if (!data) return [data];

  const jsonStr = JSON.stringify(data);
  if (jsonStr.length <= maxSize) return [data];

  console.warn(`[API] Response too large (${jsonStr.length} bytes), segmenting...`);

  if (Array.isArray(data)) {
    const segments = [];
    let current = [];
    let currentSize = 0;

    for (const item of data) {
      const itemSize = JSON.stringify(item).length;
      if (currentSize + itemSize > maxSize && current.length > 0) {
        segments.push([...current]);
        current = [];
        currentSize = 0;
      }
      current.push(item);
      currentSize += itemSize + 1; // +1 for comma
    }

    if (current.length > 0) segments.push(current);
    return segments;
  }

  return [data];
}

// Memory-efficient object transformation
export async function transformLarge(items, transformer, batchSize = 50) {
  const result = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const transformed = await Promise.all(batch.map(transformer));
    result.push(...transformed);
    // Force garbage collection hint
    await new Promise(resolve => setImmediate(resolve));
  }
  return result;
}

// Detect if request is hitting timeout
export function setupTimeoutDetection(req, timeoutMs = 28000) {
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    console.warn('[API] Function approaching timeout, should return early');
  }, timeoutMs);

  return {
    timedOut: () => timedOut,
    cancel: () => clearTimeout(timer),
  };
}

// Response compression check
export function shouldCompress(data, headers = {}) {
  if (typeof data !== 'string') return false;
  if (data.length < 500) return false; // Too small to benefit

  const acceptEncoding = headers['accept-encoding'] || '';
  return /gzip|deflate|br/.test(acceptEncoding);
}

// Lazy loading for large data structures
export class LazyDataLoader {
  constructor(loadFn) {
    this.loadFn = loadFn;
    this.data = null;
    this.loading = null;
  }

  async get() {
    if (this.data !== null) return this.data;
    if (this.loading) return this.loading;

    this.loading = this.loadFn().then(data => {
      this.data = data;
      this.loading = null;
      return data;
    });

    return this.loading;
  }

  reset() {
    this.data = null;
    this.loading = null;
  }
}
