/**
 * Reusable throttled-measurement runner for the Playwright MCP.
 *
 * Pass this whole function to `mcp__playwright__browser_run_code_unsafe` (it receives `page`).
 * It reproduces what chrome-devtools MCP would do — CPU throttle + document-start probe +
 * N runs + median — using a CDP session Playwright already exposes. No chrome-devtools MCP needed.
 *
 * Two hard-won gotchas baked in:
 *   1. page.addInitScript ACCUMULATES across run_code_unsafe calls, and a `if(window.__perf)return`
 *      guard makes newer probes bail so a stale probe wins. => run on a FRESH page each session.
 *   2. A MutationObserver "ready" stamp proved unreliable here. => stamp readyAt with a
 *      requestAnimationFrame poll instead.
 *
 * Tune URL / RUNS / rate below. Returns { keptRuns, perRun, agg }.
 */
async function runThrottled(page) {
  const URL = 'http://localhost:3100/stocktake/019f17d0-1444-795c-ac53-da2216c73cff';
  const RUNS = 6; // first is warm-up, dropped
  const CPU_RATE = 6;

  const p = await page.context().newPage(); // fresh page => no accumulated init scripts

  const PROBE_SRC = `
  (() => {
    const w = { readyAt:null, fcp:null, lcp:null, cls:0, data:[], inflight:0, lastActivity:performance.now() };
    window.__perf = w;
    try { new PerformanceObserver(l=>{for(const e of l.getEntries()) if(e.name==='first-contentful-paint') w.fcp=e.startTime;}).observe({type:'paint',buffered:true}); } catch {}
    try { new PerformanceObserver(l=>{const es=l.getEntries(); w.lcp=es[es.length-1].startTime;}).observe({type:'largest-contentful-paint',buffered:true}); } catch {}
    try { new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) w.cls+=e.value;}).observe({type:'layout-shift',buffered:true}); } catch {}
    const of = window.fetch;
    window.fetch = function(...a){ const u=(a[0]&&a[0].url)||String(a[0]||''); const d=u.includes('/graphql'); const t=performance.now(); if(d) w.inflight++;
      return of.apply(this,a).then(r=>{ if(d){ w.inflight--; w.data.push({dur:performance.now()-t}); w.lastActivity=performance.now(); } return r; })
        .catch(e=>{ if(d){ w.inflight--; w.lastActivity=performance.now(); } throw e; }); };
    const sel='[data-testid="stocktake-row"]';
    const poll=()=>{ if(w.readyAt) return; if(document.querySelector(sel)){ w.readyAt=performance.now(); return; } requestAnimationFrame(poll); };
    requestAnimationFrame(poll);
  })();`;

  const COLLECT = () => {
    const w = window.__perf || {};
    const netQuiet = (w.inflight === 0 && w.data && w.data.length) ? Math.round(w.lastActivity + 500) : null;
    const slowest = w.data && w.data.length ? Math.round(Math.max(...w.data.map((d) => d.dur))) : null;
    const countEl = document.querySelector('[data-testid="stocktake-lines"]');
    const res = performance.getEntriesByType('resource');
    return {
      timeToDataRenderedMs: w.readyAt != null ? Math.round(w.readyAt) : null,
      timeToNetworkQuietMs: netQuiet,
      dataRequestCount: (w.data || []).length,
      slowestDataRequestMs: slowest,
      fcpMs: w.fcp != null ? Math.round(w.fcp) : null,
      lcpMs: w.lcp != null ? Math.round(w.lcp) : null,
      cls: w.cls != null ? Number(w.cls.toFixed(3)) : null,
      jsHeapUsedMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
      domNodes: document.getElementsByTagName('*').length,
      requestCount: res.length,
      transferKB: Math.round(res.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
      dataItemCount: countEl ? Number(countEl.getAttribute('data-line-count')) : null,
    };
  };

  p.setDefaultTimeout(45000);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE });
  // Optional network: await cdp.send('Network.emulateNetworkConditions', { offline:false, latency:150, downloadThroughput:1.6e6/8, uploadThroughput:750e3/8 });
  await p.addInitScript({ content: PROBE_SRC });

  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    try {
      await p.goto(URL, { waitUntil: 'commit' });
      await p.waitForSelector('[data-testid="stocktake-row"]');
      await p.waitForFunction(() => { const w = window.__perf; return w && w.readyAt != null && w.data.length > 0 && w.inflight === 0 && performance.now() - w.lastActivity > 500; });
      runs.push({ run: i, warmup: i === 0, ...(await p.evaluate(COLLECT)) });
    } catch (e) { runs.push({ run: i, error: String(e).slice(0, 120) }); }
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await p.close();

  const kept = runs.filter((r) => !r.warmup && !r.error && r.timeToDataRenderedMs != null);
  const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
  const agg = (k) => { const v = kept.map((r) => r[k]).filter((x) => x != null); return v.length ? { median: med(v), min: Math.min(...v), max: Math.max(...v) } : null; };
  const KEYS = ['timeToDataRenderedMs', 'timeToNetworkQuietMs', 'slowestDataRequestMs', 'fcpMs', 'lcpMs', 'cls', 'jsHeapUsedMB', 'domNodes', 'dataRequestCount', 'requestCount', 'transferKB'];
  return { cpuThrottle: CPU_RATE, keptRuns: kept.length, perRun: runs, agg: Object.fromEntries(KEYS.map((k) => [k, agg(k)]).concat([['dataItemCount', kept[0] ? kept[0].dataItemCount : null]])) };
}
