#!/usr/bin/env node
/**
 * Validate published package export maps against their built artifacts.
 *
 * Run after the affected packages have been built:
 *   pnpm validate:exports
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesDirectory = path.join(repoRoot, 'packages');
const supportedConditions = new Set(['mp:vue', 'mp:react', 'mp:solid', 'mp:svelte', 'mp:web-component']);
const failures = [];
let checkedTargets = 0;

function targetFiles(target) {
  const absoluteTarget = path.resolve(packagesDirectory, target.packageName, target.path);
  if (!target.path.includes('*')) return fs.existsSync(absoluteTarget) ? [absoluteTarget] : [];

  const directory = path.dirname(absoluteTarget);
  if (!fs.existsSync(directory)) return [];
  const suffix = path.basename(absoluteTarget).replace('*', '');
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(suffix))
    .map((file) => path.join(directory, file));
}

function validateTarget(packageName, target, kind) {
  if (typeof target !== 'string' || !target.startsWith('./')) {
    failures.push(`${packageName}: ${kind} target must be a relative package path`);
    return;
  }

  checkedTargets += 1;
  if (targetFiles({ packageName, path: target.slice(2) }).length === 0) {
    failures.push(`${packageName}: ${kind} target does not exist after build: ${target}`);
  }
}

function validateEntry(packageName, entry, exportPath) {
  if (typeof entry === 'string') {
    validateTarget(packageName, entry, `${exportPath} export`);
    return;
  }
  if (!entry || typeof entry !== 'object') return;

  for (const [condition, value] of Object.entries(entry)) {
    if (condition.startsWith('mp:') && !supportedConditions.has(condition)) {
      failures.push(`${packageName}: unsupported framework export condition ${condition}`);
    }
    if (condition === 'types' || condition === 'import' || condition === 'default') {
      validateTarget(packageName, value, `${exportPath} ${condition}`);
    } else if (value && typeof value === 'object') {
      validateEntry(packageName, value, `${exportPath} ${condition}`);
    }
  }

  if (typeof entry.import === 'string' && typeof entry.types === 'string') {
    const expectedTypes = entry.import.replace(/\.js$/, '.d.ts');
    const usesFrameworkIndexDeclaration = entry.import.includes('*') && entry.types.endsWith('/index.d.ts');
    if (entry.import.endsWith('.js') && entry.types !== expectedTypes && !usesFrameworkIndexDeclaration) {
      failures.push(`${packageName}: ${exportPath} types target does not match import target`);
    }
  }
}

for (const directoryName of fs.readdirSync(packagesDirectory)) {
  const packageName = directoryName;
  const manifestPath = path.join(packagesDirectory, directoryName, 'package.json');
  if (!fs.existsSync(manifestPath)) continue;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest.exports || typeof manifest.exports !== 'object') continue;
  for (const [exportPath, entry] of Object.entries(manifest.exports)) {
    validateEntry(packageName, entry, exportPath);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
  process.exit(1);
}

process.stdout.write(`Validated ${checkedTargets} published export targets.\n`);
