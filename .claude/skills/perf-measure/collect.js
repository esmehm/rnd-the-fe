/**
 * perf-measure deterministic in-page collector — v3
 *
 * Two entry points, both meant to be injected into the page via the browser MCP:
 *
 *   1. PROBE_SRC  — eval this at *document-start* (before app scripts) so we can catch
 *                   paint/LCP entries and wrap fetch/XHR before the app fires any request.
 *   2. COLLECT_SRC — eval this after the "page ready" signal to read the metric set as JSON.
 *
 * Keep this file versioned; bump COLLECTOR_VERSION whenever the collected shape changes,
 * so rows in the results doc stay comparable.
 *
 * The headline metrics are CONTENT-based, not the `load` event (see SKILL.md gotchas):
 *   - timeToDataRenderedMs : navigationStart -> the ready DOM signal appears
 *   - timeToNetworkQuietMs : navigationStart -> no in-flight data request for QUIET_MS
 */
export const COLLECTOR_VERSION = 3;

// The DOM signal that the real content the user came for is on screen.
export const READY_SELECTOR = '[data-testid="stocktake-row"]';
// Element carrying the rendered data-item count (a 50-row vs 1500-row page aren't comparable).
export const COUNT_SELECTOR = '[data-testid="stocktake-lines"]';
// Requests we treat as "data" for the network-quiet calc.
export const DATA_URL_PATTERN = '/graphql';
const QUIET_MS = 500;

// Installed at document-start. Idempotent.
export const PROBE_SRC = `
(() => {
  if (window.__perf) return;
  const nav = performance.timeOrigin;
  const w = { readyAt: null, lcp: null, fcp: null, cls: 0, data: [], inflight: 0, lastActivity: performance.now() };
  window.__perf = w;

  // paint + LCP + CLS observers (buffered so we catch entries fired before this ran)
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') w.fcp = e.startTime; })
      .observe({ type: 'paint', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((l) => { const es = l.getEntries(); w.lcp = es[es.length - 1].startTime; })
      .observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) w.cls += e.value; })
      .observe({ type: 'layout-shift', buffered: true });
  } catch {}

  // wrap fetch to time data calls + track in-flight for the network-quiet metric
  const pat = ${JSON.stringify(DATA_URL_PATTERN)};
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const url = (args[0] && args[0].url) || String(args[0] || '');
    const isData = url.includes(pat);
    const t0 = performance.now();
    if (isData) { w.inflight++; }
    return origFetch.apply(this, args).then((res) => {
      if (isData) { w.inflight--; const dur = performance.now() - t0; w.data.push({ url, dur }); w.lastActivity = performance.now(); }
      return res;
    }).catch((e) => { if (isData) { w.inflight--; w.lastActivity = performance.now(); } throw e; });
  };

  // MutationObserver stamps the first moment the ready content exists
  const sel = ${JSON.stringify(READY_SELECTOR)};
  const check = () => { if (!w.readyAt && document.querySelector(sel)) { w.readyAt = performance.now(); } };
  const mo = new MutationObserver(check);
  mo.observe(document.documentElement, { childList: true, subtree: true });
  check();
})();
`;

// Evaluated after ready. Returns the fixed metric set (client-measurable subset).
export const COLLECT_SRC = `
(() => {
  const w = window.__perf || {};
  const t = performance.timing || {};
  const navEntry = performance.getEntriesByType('navigation')[0] || {};
  const ttfb = navEntry.responseStart || (t.responseStart && t.responseStart - t.navigationStart) || null;
  const loadMs = navEntry.loadEventEnd || null;

  // network-quiet: last data-request activity + QUIET, if nothing is in-flight
  const quiet = ${QUIET_MS};
  const netQuiet = (w.inflight === 0 && w.data.length)
    ? Math.round(w.lastActivity + quiet)
    : null;

  const slowest = w.data && w.data.length ? Math.round(Math.max(...w.data.map(d => d.dur))) : null;

  const countEl = document.querySelector(${JSON.stringify(COUNT_SELECTOR)});
  const dataItemCount = countEl ? Number(countEl.getAttribute('data-line-count')) : null;

  const res = performance.getEntriesByType('resource');
  const transferKB = Math.round(res.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024);

  return {
    collectorVersion: ${COLLECTOR_VERSION},
    // headline (content-based)
    timeToDataRenderedMs: w.readyAt != null ? Math.round(w.readyAt) : null,
    timeToNetworkQuietMs: netQuiet,
    // network waterfall
    dataRequestCount: (w.data || []).length,
    slowestDataRequestMs: slowest,
    // reference (record, don't rank)
    ttfbMs: ttfb != null ? Math.round(ttfb) : null,
    fcpMs: w.fcp != null ? Math.round(w.fcp) : null,
    loadMs: loadMs != null ? Math.round(loadMs) : null,
    cls: w.cls != null ? Number(w.cls.toFixed(3)) : null,
    lcpMs: w.lcp != null ? Math.round(w.lcp) : null, // often null for this SPA — expected
    // memory + weight
    jsHeapUsedMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    domNodes: document.getElementsByTagName('*').length,
    requestCount: res.length,
    transferKB,
    dataItemCount,
  };
})();
`;
