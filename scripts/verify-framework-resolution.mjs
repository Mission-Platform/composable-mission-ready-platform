#!/usr/bin/env node
/**
 * Framework auto-resolution fixture.
 *
 * Verifies that every framework-shipping `@mission-platform/*` package wires a
 * custom `mp:<framework>` export condition on its bare `.` entry that resolves
 * to the SAME built artifact as its explicit `./<framework>` subpath export,
 * and that a plain (condition-less) resolution still falls back to the neutral
 * entry. This proves the "one app-level setting picks the framework build"
 * behaviour deterministically, without needing every package pre-built.
 *
 * Run: `node scripts/verify-framework-resolution.mjs`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = path.join(repoRoot, 'packages');

/** Map custom condition -> explicit subpath export key. */
const CONDITION_TO_SUBPATH = {
  'mp:vue': './vue',
  'mp:react': './react',
  'mp:solid': './solid',
  'mp:svelte': './svelte',
  'mp:web-component': './web-components',
};

/** Resolve the concrete `import` target of an exports entry (string or object). */
function importTargetOf(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') return entry.import ?? entry.default ?? null;
  return null;
}

let failures = 0;
let checked = 0;
const rows = [];

for (const name of fs.readdirSync(packagesDir)) {
  const manifestPath = path.join(packagesDir, name, 'package.json');
  if (!fs.existsSync(manifestPath)) continue;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const exportsMap = manifest.exports;
  if (!exportsMap || typeof exportsMap !== 'object') continue;
  const dot = exportsMap['.'];
  if (!dot || typeof dot !== 'object') continue;

  const declaredConditions = Object.keys(dot).filter((k) => k.startsWith('mp:'));
  if (declaredConditions.length === 0) continue;

  for (const condition of declaredConditions) {
    checked += 1;
    const subpathKey = CONDITION_TO_SUBPATH[condition];
    const conditionTarget = importTargetOf(dot[condition]);
    const subpathTarget = importTargetOf(exportsMap[subpathKey]);
    const ok = Boolean(subpathKey) && conditionTarget != null && conditionTarget === subpathTarget;
    if (!ok) failures += 1;
    rows.push({ pkg: name, condition, conditionTarget, subpathTarget, ok });
  }

  // The plain (condition-less) fallback must still expose an `import`/`default`.
  if (importTargetOf({ import: dot.import, default: dot.default }) == null) {
    failures += 1;
    rows.push({ pkg: name, condition: '(fallback)', conditionTarget: null, subpathTarget: null, ok: false });
  }
}

for (const r of rows) {
  const status = r.ok ? 'ok ' : 'ERR';
  console.log(`[${status}] ${r.pkg.padEnd(14)} ${r.condition.padEnd(18)} ${r.conditionTarget ?? '—'} == ${r.subpathTarget ?? '—'}`);
}

console.log(`\nChecked ${checked} framework conditions across packages; ${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
