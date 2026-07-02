#!/usr/bin/env node
/**
 * append-row.mjs — owns the results-doc HTML format.
 *
 * - COLUMNS is the single source of truth for column order + headers.
 * - Creates docs/perf/frontend-runs.html on first run (self-contained).
 * - Inserts one <tr> immediately before the <!--ROWS--> marker, newest at the bottom.
 * - REFUSES to write if the marker is missing or not unique, so history can't be
 *   silently corrupted.
 *
 * Usage:
 *   node append-row.mjs '<json-object>'         # row data as a JSON string
 *   node append-row.mjs --file row.json         # or from a file
 *   node append-row.mjs --doc path/to.html ...  # override doc path
 *
 * The JSON keys should match COLUMNS[].key. Missing keys render as "—".
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const RESULTS_DOC = 'docs/perf/frontend-runs.html';
const MARKER = '<!--ROWS-->';

// Fixed contract — keep in this order for every teammate's doc. Extra columns may be
// appended after these, but never drop or reorder the fixed set.
export const COLUMNS = [
  { key: 'timestampUtc', label: 'UTC time', group: 'context' },
  { key: 'scenario', label: 'Scenario', group: 'context' },
  { key: 'gitBranch', label: 'Branch', group: 'context' },
  { key: 'gitCommit', label: 'Commit', group: 'context' },
  { key: 'machine', label: 'Machine', group: 'context' },
  { key: 'cpuThrottle', label: 'CPU×', group: 'context' },
  { key: 'network', label: 'Network', group: 'context' },
  { key: 'cache', label: 'Cache', group: 'context' },
  { key: 'dataItemCount', label: 'Data items', group: 'context' },
  { key: 'runs', label: 'Runs (N)', group: 'context' },
  { key: 'timeToDataRenderedMs', label: 'Data rendered ms', group: 'headline' },
  { key: 'timeToNetworkQuietMs', label: 'Network quiet ms', group: 'headline' },
  { key: 'dataRequestCount', label: 'Data reqs', group: 'network' },
  { key: 'slowestDataRequestMs', label: 'Slowest req ms', group: 'network' },
  { key: 'ttfbMs', label: 'TTFB ms', group: 'reference' },
  { key: 'fcpMs', label: 'FCP ms', group: 'reference' },
  { key: 'loadMs', label: 'load ms', group: 'reference' },
  { key: 'cls', label: 'CLS', group: 'reference' },
  { key: 'lcpMs', label: 'LCP ms', group: 'reference' },
  { key: 'jsHeapUsedMB', label: 'Heap MB', group: 'memory' },
  { key: 'domNodes', label: 'DOM nodes', group: 'weight' },
  { key: 'requestCount', label: 'Requests', group: 'weight' },
  { key: 'transferKB', label: 'Transfer KB', group: 'weight' },
  { key: 'notes', label: 'Notes', group: 'context' },
];

const esc = (v) =>
  String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function emptyDoc() {
  const headCells = COLUMNS.map((c) => `<th data-group="${c.group}">${esc(c.label)}</th>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Frontend perf runs</title>
<style>
  body { font: 13px/1.5 system-ui, sans-serif; margin: 24px; color: #1c2433; }
  h1 { font-size: 20px; } .note { color: #6b7686; max-width: 900px; }
  table { border-collapse: collapse; margin-top: 16px; width: 100%; }
  th, td { border: 1px solid #e0e4ea; padding: 6px 8px; text-align: right; white-space: nowrap; }
  th { position: sticky; top: 0; background: #fff; }
  th[data-group="headline"], td.headline { background: #eef6ff; font-weight: 600; }
  th[data-group="context"], td.context { text-align: left; }
  tbody tr:nth-child(even) { background: #fafbfc; }
</style></head><body>
<h1>Frontend performance runs</h1>
<p class="note">
  Bake-off results. Headline metrics are <b>content-based</b>, reported as
  <b>median of N (min–max)</b>. Rank on <b>Network quiet ms</b> (when the data layer
  goes idle) — the <code>load</code> event is misleading for this SPA.
  <b>LCP is often blank</b> for a client-rendered table injected after first paint — that's
  expected, not an error. Two rows only compare when Machine, CPU×, Cache and Data items match.
</p>
<table><thead><tr>${headCells}</tr></thead>
<tbody>
${MARKER}
</tbody></table>
</body></html>
`;
}

export function appendRow(row, docPath = RESULTS_DOC) {
  if (!existsSync(docPath)) {
    mkdirSync(dirname(docPath), { recursive: true });
    writeFileSync(docPath, emptyDoc());
  }
  const html = readFileSync(docPath, 'utf8');
  const count = html.split(MARKER).length - 1;
  if (count !== 1) {
    throw new Error(`Refusing to write: expected exactly 1 "${MARKER}" marker, found ${count} in ${docPath}`);
  }
  const cells = COLUMNS.map((c) => {
    const v = row[c.key];
    const cls = c.group === 'headline' ? ' class="headline"' : c.group === 'context' ? ' class="context"' : '';
    return `<td${cls}>${v == null || v === '' ? '—' : esc(v)}</td>`;
  }).join('');
  const tr = `<tr>${cells}</tr>\n${MARKER}`;
  writeFileSync(docPath, html.replace(MARKER, tr));
  return docPath;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  let docPath = RESULTS_DOC;
  const di = args.indexOf('--doc');
  if (di !== -1) { docPath = args[di + 1]; args.splice(di, 2); }
  const fi = args.indexOf('--file');
  let json;
  if (fi !== -1) json = readFileSync(args[fi + 1], 'utf8');
  else json = args[0];
  if (!json) { console.error('Provide a JSON row (arg) or --file path.json'); process.exit(1); }
  const out = appendRow(JSON.parse(json), docPath);
  console.log(`Appended 1 row to ${out}`);
}
