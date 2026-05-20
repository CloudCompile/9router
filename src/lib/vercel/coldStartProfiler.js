// Cold start profiler - measures initialization time on Vercel
// Exports metrics to help optimize startup performance

const startTime = Date.now();
let marks = {};

export function mark(label) {
  marks[label] = Date.now() - startTime;
  if (process.env.DEBUG_COLD_START) {
    console.log(`[ColdStart] ${label}: ${marks[label]}ms`);
  }
}

export function measure(label, startMark, endMark) {
  if (!marks[startMark] || !marks[endMark]) {
    console.warn(`[ColdStart] Missing mark: ${startMark} or ${endMark}`);
    return;
  }
  const duration = marks[endMark] - marks[startMark];
  if (process.env.DEBUG_COLD_START) {
    console.log(`[ColdStart] Measure ${label}: ${duration}ms`);
  }
  return duration;
}

export function getMetrics() {
  return {
    totalTime: Date.now() - startTime,
    marks,
    isVercel: !!process.env.VERCEL,
  };
}

// Attach profiler to response headers for debugging
export function addMetricsHeaders(response) {
  const metrics = getMetrics();
  response.headers.set('X-ColdStart-Ms', metrics.totalTime.toString());
  response.headers.set('X-ColdStart-Debug', JSON.stringify(metrics.marks));
  return response;
}

// Auto-mark common initialization points
mark('module-load');

if (typeof globalThis !== 'undefined') {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function(...args) {
    const result = await originalFetch.apply(this, args);
    return result;
  };
}

export default {
  mark,
  measure,
  getMetrics,
  addMetricsHeaders,
};
