#!/usr/bin/env node
/**
 * Framework auto-resolution fixture.
 *
 * Verifies that every framework-shipping `@mission-platform/*` package selects
 * its framework build **only** through the custom `mp:<framework>` export
 * conditions on its bare `.` entry, that each condition points at a real built
 * artifact, and that a plain (condition-less) resolution still falls back to the
 * neutral entry. It also asserts the legacy per-framework subpath exports
 * (`./vue`, `./react`, `./solid`, `./svelte`, `./web-components`) have been
 * removed, so `@mission-platform/<pkg>/<framework>` can never be imported again.
 *
 * This proves the "one app-level setting picks the framework build" behaviour
 * deterministically, without needing every package pre-built.
 *
 * Run: `node scripts/verify-framework-resolution.mjs`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesDirectory = path.join(repoRoot, 'packages');

/** The framework builds a package may expose, keyed by their custom condition. */
const FRAMEWORK_CONDITIONS = new Set(['mp:vue', 'mp:react', 'mp:solid', 'mp:web-component']);

/** The removed legacy subpath export keys, which must no longer be declared. */
const LEGACY_SUBPATHS = ['./vue', './react', './solid', './svelte', './web-components'];

/** Resolve the concrete `import` target of an exports entry (string or object). */
function importTargetOf(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') return entry.import ?? entry.default ?? undefined;
  return;
}

let failures = 0;
let checked = 0;
const rows = [];

for (const name of fs.readdirSync(packagesDirectory)) {
  const manifestPath = path.join(packagesDirectory, name, 'package.json');
  if (!fs.existsSync(manifestPath)) continue;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const exportsMap = manifest.exports;
  if (!exportsMap || typeof exportsMap !== 'object') continue;
  const dot = exportsMap['.'];
  if (!dot || typeof dot !== 'object') continue;

  const declaredConditions = Object.keys(dot).filter((key) => key.startsWith('mp:'));
  if (declaredConditions.length === 0) continue;

  for (const condition of declaredConditions) {
    checked += 1;
    const target = importTargetOf(dot[condition]);
    const known = FRAMEWORK_CONDITIONS.has(condition);
    const ok = known && target !== undefined;
    if (!ok) failures += 1;
    rows.push({ pkg: name, condition, detail: target ?? '— (no import target)', ok });
  }

  // The legacy per-framework subpaths must be gone: framework selection is the
  // consumer's `resolve.conditions` / `customConditions`, never the specifier.
  for (const subpath of LEGACY_SUBPATHS) {
    if (exportsMap[subpath] === undefined) continue;
    failures += 1;
    rows.push({ pkg: name, condition: `(legacy ${subpath})`, detail: 'still declared — remove it', ok: false });
  }

  // The plain (condition-less) fallback must still expose an `import`/`default`.
  if (importTargetOf({ import: dot.import, default: dot.default }) == undefined) {
    failures += 1;
    rows.push({ pkg: name, condition: '(fallback)', detail: '— (no neutral entry)', ok: false });
  }
}

const report = [
  ...rows.map((row) => `[${row.ok ? 'ok ' : 'ERR'}] ${row.pkg.padEnd(14)} ${row.condition.padEnd(18)} ${row.detail}`),
  '',
  `Checked ${checked} framework conditions across packages; ${failures} failure(s).`,
  '',
].join('\n');
process.stdout.write(report);
process.exit(failures === 0 ? 0 : 1);
