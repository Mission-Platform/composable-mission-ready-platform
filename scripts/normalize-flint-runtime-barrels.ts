import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const roots = ['packages/ui', 'packages/content', 'packages/core/scheduler', 'packages/integrations'];
const ignored = new Set(['node_modules', 'dist', '.git']);

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

let changed = 0;
for (const root of roots) {
  if (!existsSync(root)) continue;
  for (const file of walk(root).filter((candidate) => candidate.endsWith('/index.ts'))) {
    const source = readFileSync(file, 'utf8');
    const normalized = source.replaceAll('.flintc', '.tsx');
    if (normalized === source) continue;
    writeFileSync(file, normalized, 'utf8');
    changed += 1;
  }
}
console.log(`Updated ${changed} runtime component barrels.`);
