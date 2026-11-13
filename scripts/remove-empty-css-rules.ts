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

const emptyRule = /(^[ \t]*[^{}\n]+\{)([\s\S]*?)(^[ \t]*\})/gmu;
let changed = 0;
for (const root of roots) {
  if (!existsSync(root)) continue;
  for (const file of walk(root).filter((candidate) => candidate.endsWith('.module.css'))) {
    const source = readFileSync(file, 'utf8');
    const normalized = source.replace(emptyRule, (match, opening: string, body: string, closing: string) => {
      const withoutComments = body.replace(/\/\*[\s\S]*?\*\//gu, '').trim();
      return withoutComments.length === 0 ? '' : `${opening}${body}${closing}`;
    });
    if (normalized === source) continue;
    writeFileSync(file, normalized.replace(/\n{3,}/gu, '\n\n'), 'utf8');
    changed += 1;
  }
}
console.log(`Removed empty CSS rules from ${changed} module files.`);
