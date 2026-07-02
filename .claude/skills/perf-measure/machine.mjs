#!/usr/bin/env node
/**
 * machine.mjs — emit a compact, comparable machine descriptor for a perf-run row.
 *
 * Two rows only compare when the HARDWARE matches (see bench-prompt.md, Step 2:
 * "stamp machine info — CPU model if available, core count, OS"). The browser
 * can't see the chip name (navigator only gives a core count), so this reads it
 * from the OS. Run it and paste the result into the `machine` field when appending:
 *
 *   MACHINE="$(node .claude/skills/perf-measure/machine.mjs) · Chromium(Playwright)"
 *   node .claude/skills/perf-measure/append-row.mjs "{\"machine\": \"$MACHINE\", ...}"
 *
 * Append the browser channel yourself (· Chromium(Playwright) / · Chrome(Playwright))
 * since that's a property of the run, not the machine.
 *
 * Output example: "Apple M3 Pro (12c, 18GB) macOS 26.2"
 */
import os from 'node:os';
import { execSync } from 'node:child_process';

const sh = (cmd) => {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
};

function chip() {
  if (process.platform === 'darwin') return sh('sysctl -n machdep.cpu.brand_string');
  if (process.platform === 'linux') {
    const line = sh("grep -m1 'model name' /proc/cpuinfo");
    return line.includes(':') ? line.split(':')[1].trim() : '';
  }
  if (process.platform === 'win32') return sh('wmic cpu get name /value').split('=')[1] || '';
  return '';
}

function osLabel() {
  if (process.platform === 'darwin') {
    const v = sh('sw_vers -productVersion');
    return v ? `macOS ${v}` : `darwin ${os.release()}`;
  }
  return `${os.type()} ${os.release()}`;
}

const cpu = chip() || os.cpus()[0]?.model || 'unknown-cpu';
const cores = os.cpus().length;
const ramGB = Math.round(os.totalmem() / 1024 ** 3);

console.log(`${cpu} (${cores}c, ${ramGB}GB) ${osLabel()}`);
