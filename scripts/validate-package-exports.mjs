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
  const absoluteTarget = path.resolve(target.packageDirectory, target.path);
  if (!target.path.includes('*')) return fs.existsSync(absoluteTarget) ? [absoluteTarget] : [];

  const directory = path.dirname(absoluteTarget);
  if (!fs.existsSync(directory)) return [];
  const suffix = path.basename(absoluteTarget).replace('*', '');
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(suffix))
    .map((file) => path.join(directory, file));
}

function validateTarget(packageInfo, target, kind) {
  if (typeof target !== 'string' || !target.startsWith('./')) {
    failures.push(`${packageInfo.packageName}: ${kind} target must be a relative package path`);
    return;
  }

  checkedTargets += 1;
  if (targetFiles({ packageDirectory: packageInfo.packageDirectory, path: target.slice(2) }).length === 0) {
    failures.push(`${packageInfo.packageName}: ${kind} target does not exist after build: ${target}`);
  }
}

function packageDirectories(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const packageDirectory = path.join(directory, entry.name);
    const manifestPath = path.join(packageDirectory, 'package.json');
    if (fs.existsSync(manifestPath)) {
      result.push({ packageDirectory, manifestPath });
      continue;
    }
    result.push(...packageDirectories(packageDirectory));
  }
  return result;
}

function validateEntry(packageInfo, entry, exportPath) {
  if (typeof entry === 'string') {
    validateTarget(packageInfo, entry, `${exportPath} export`);
    return;
  }
  if (!entry || typeof entry !== 'object') return;

  for (const [condition, value] of Object.entries(entry)) {
    if (condition.startsWith('mp:') && !supportedConditions.has(condition)) {
      failures.push(`${packageInfo.packageName}: unsupported framework export condition ${condition}`);
    }
    if (condition === 'types' || condition === 'import' || condition === 'default') {
      validateTarget(packageInfo, value, `${exportPath} ${condition}`);
    } else if (value && typeof value === 'object') {
      validateEntry(packageInfo, value, `${exportPath} ${condition}`);
    }
  }

  if (typeof entry.import === 'string' && typeof entry.types === 'string') {
    const expectedTypes = entry.import.replace(/\.js$/, '.d.ts');
    const usesFrameworkIndexDeclaration = entry.import.includes('*') && entry.types.endsWith('/index.d.ts');
    if (entry.import.endsWith('.js') && entry.types !== expectedTypes && !usesFrameworkIndexDeclaration) {
      failures.push(`${packageInfo.packageName}: ${exportPath} types target does not match import target`);
    }
  }
}

for (const { packageDirectory, manifestPath } of packageDirectories(packagesDirectory)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest.exports || typeof manifest.exports !== 'object') continue;
  const packageName = manifest.name ?? path.relative(packagesDirectory, packageDirectory);
  for (const [exportPath, entry] of Object.entries(manifest.exports)) {
    validateEntry({ packageDirectory, packageName }, entry, exportPath);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
  process.exit(1);
}

process.stdout.write(`Validated ${checkedTargets} published export targets.\n`);
