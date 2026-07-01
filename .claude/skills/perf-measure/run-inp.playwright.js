/**
 * INP + scroll-jank runner for the Playwright MCP (pass to browser_run_code_unsafe).
 *
 * Complements run-throttled.playwright.js (which does LOAD metrics). This drives real
 * interactions under 6× CPU and reads the Event Timing API to get INP per interaction,
 * plus a rAF frame-gap measurement during a real wheel-scroll.
 *
 * Why real Playwright input (not evaluate + dispatchEvent): only trusted events produce
 * PerformanceEventTiming entries with an interactionId, so synthetic dispatch would
 * measure nothing. CDP throttle inflates handler+render time → realistic M10 INP.
 *
 * Gotchas baked in:
 *   - A discarded WARM-UP interaction: the first interaction after load is inflated by
 *     deferred work (we saw a 1,328 ms artifact without it; ~296 ms with it).
 *   - Per-step attribution: snapshot event count before each step, take the max
 *     interaction duration in that step's window.
 *   - Order-independent selectors (sorting reorders the virtualised rows).
 */
async function runInp(page) {
  const URL = 'http://localhost:3200/inventory/stocktakes/019f17d0-1444-795c-ac53-da2216c73cff';
  const p = await page.context().newPage();
  await p.setViewportSize({ width: 1280, height: 800 });

  const PROBE = `(() => { const w = { events: [] }; window.__inp = w;
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.interactionId) w.events.push({ id: e.interactionId, dur: e.duration }); })
      .observe({ type: 'event', durationThreshold: 16, buffered: true }); } catch {}
  })();`;

  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Page.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  p.setDefaultTimeout(20000);
  await p.goto(URL, { waitUntil: 'commit' });
  await p.waitForSelector('[data-testid="stocktake-row"]');
  await p.waitForTimeout(1800);

  const results = [];
  const step = async (label, fn) => {
    const start = await p.evaluate(() => window.__inp.events.length);
    try {
      await fn();
      await p.waitForTimeout(800);
      const ms = await p.evaluate((s) => {
        const ev = window.__inp.events.slice(s);
        if (!ev.length) return null;
        const m = new Map();
        for (const e of ev) m.set(e.id, Math.max(m.get(e.id) || 0, e.dur));
        return Math.round(Math.max(...m.values()));
      }, start);
      results.push({ label, inpMs: ms });
    } catch (e) {
      results.push({ label, error: String(e).slice(0, 40) });
    }
  };

  await step('warmup', async () => { await p.getByRole('button', { name: 'Show or hide columns' }).click(); await p.keyboard.press('Escape'); });
  await step('sort', async () => { await p.getByRole('columnheader', { name: /^Batch/ }).click(); });
  await step('select-row', async () => { await p.locator('[data-testid="stocktake-row"] input[type="checkbox"]').first().click(); });
  await step('cell-edit', async () => { const c = p.locator('input[aria-label^="Packs counted"]').first(); await c.click(); await c.pressSequentially('56', { delay: 150 }); });
  await step('open-modal', async () => { await p.locator('[data-testid="stocktake-row"] [role="button"]').first().click(); });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);

  // scroll jank: frame gaps during a real wheel scroll
  await p.evaluate(() => { window.__f = []; let last = performance.now(); const loop = () => { const n = performance.now(); window.__f.push(n - last); last = n; window.__raf = requestAnimationFrame(loop); }; window.__raf = requestAnimationFrame(loop); });
  const box = await p.locator('[role="grid"]').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 16; i++) { await p.mouse.wheel(0, 500); await p.waitForTimeout(70); }
  const scroll = await p.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    const f = window.__f.filter((x) => x > 0).sort((a, b) => b - a);
    return { worstFrameMs: Math.round(f[0] || 0), medianFrameMs: Math.round(f[Math.floor(f.length / 2)] || 0), longFrames_gt50ms: f.filter((x) => x > 50).length };
  });

  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await p.close();
  const measured = results.filter((r) => r.label !== 'warmup' && r.inpMs != null);
  return { perStep: results, inpWorstMs: Math.max(...measured.map((r) => r.inpMs)), scroll };
}
