import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const roots = ['packages/ui', 'packages/content', 'packages/core/scheduler', 'packages/integrations'];
const ignored = new Set(['node_modules', 'dist', '.git']);

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function findMatchingDelimiter(source: string, open: number): number {
  const opening = source[open];
  const closing = opening === '{' ? '}' : opening === '(' ? ')' : ']';
  let depth = 0;
  let quote: "'" | '"' | '`' | undefined;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = open; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === '\n' || character === '\r') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote !== undefined) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === opening) depth += 1;
    if (character === closing) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return source.length - 1;
}

function findStatementEnd(source: string, start: number): number {
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let quote: "'" | '"' | '`' | undefined;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== undefined) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') braceDepth += 1;
    else if (character === '}') braceDepth -= 1;
    else if (character === '(') parenDepth += 1;
    else if (character === ')') parenDepth -= 1;
    else if (character === '[') bracketDepth += 1;
    else if (character === ']') bracketDepth -= 1;
    else if (character === ';' && braceDepth === 0 && parenDepth === 0 && bracketDepth === 0) {
      return index;
    }
  }
  return source.length;
}

function stripHtmlMacroWrappers(expression: string): string {
  const marker = /\bhtml!\s*\{/gu;
  let result = '';
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = marker.exec(expression)) !== null) {
    const open = expression.indexOf('{', match.index);
    if (open < 0) break;
    const close = findMatchingDelimiter(expression, open);
    result += expression.slice(cursor, match.index);
    result += stripHtmlMacroWrappers(expression.slice(open + 1, close));
    cursor = close + 1;
    marker.lastIndex = cursor;
  }
  return `${result}${expression.slice(cursor)}`;
}

function extractTemplate(scriptSource: string): { readonly source: string; readonly template?: string } {
  let script = scriptSource.replace(/^\s*<script>\s*/u, '');
  const returnMatch = /\breturn\s+(?=[^;\n]*html!\s*\{)/u.exec(script);
  if (returnMatch === null) return { source: script };
  const returnStart = returnMatch.index;
  const expressionStart = returnStart + returnMatch[0].length;
  const statementEnd = findStatementEnd(script, expressionStart);
  const expression = stripHtmlMacroWrappers(script.slice(expressionStart, statementEnd).trim());
  const template = expression.startsWith('<') ? expression : `{${expression}}`;
  script = `${script.slice(0, returnStart)}${script.slice(statementEnd + 1)}`;
  return { source: script, template };
}

function regionContents(source: string, region: 'script' | 'template' | 'style', occurrence = -1): string {
  const pattern = new RegExp(`<${region}>([\\s\\S]*?)</${region}>`, 'gu');
  const matches = [...source.matchAll(pattern)];
  const match = matches.at(occurrence);
  return match?.[1] ?? '';
}

function normalizeSourceImports(source: string): string {
  const normalized = source.replace(
    /(^\s*)import\s+(["'][^"']+["'])\s+as\s+([A-Za-z_]\w*)\s*;?/gmu,
    (_match, indentation: string, quotedSource: string, localName: string) =>
      quotedSource === '"@mission-platform/forge-jsx"' || quotedSource === "'@mission-platform/forge-jsx'"
        ? `${indentation}import { ${localName} } from ${quotedSource};`
        : `${indentation}import * as ${localName} from ${quotedSource};`,
  );
  return normalized.replace(
    /(^\s*)import\s+\*\s+as\s+([A-Za-z_]\w*)\s+from\s+(["']@mission-platform\/forge-jsx["'])\s*;?/gmu,
    '$1import { $2 } from $3;',
  );
}

function extractCssMacros(source: string): { readonly source: string; readonly css: string } {
  let script = source;
  const blocks: string[] = [];
  let marker = script.lastIndexOf('css!');
  while (marker >= 0) {
    const open = script.indexOf('{', marker);
    if (open < 0) break;
    const end = findMatchingDelimiter(script, open) + 1;
    blocks.unshift(script.slice(open + 1, end - 1).trim());
    const lineStart = script.lastIndexOf('\n', marker) + 1;
    const prefix = script.slice(lineStart, marker);
    const bindingStart = /\blet\s+[A-Za-z_]\w*\s*=\s*$/u.test(prefix)
      ? lineStart + (prefix.search(/\blet\s+[A-Za-z_]\w*\s*=\s*$/u) ?? 0)
      : marker;
    script = `${script.slice(0, bindingStart)}${script.slice(end)}`;
    marker = script.lastIndexOf('css!');
  }
  return { source: script, css: blocks.filter(Boolean).join('\n\n') };
}

function migrate(filePath: string): boolean {
  const source = readFileSync(filePath, 'utf8');
  const directory = path.dirname(filePath);
  const componentRoot = path.basename(filePath, '.flintc');
  const legacyFiles = [
    path.join(directory, 'types.ts'),
    path.join(directory, `${componentRoot}.module.scss`),
    path.join(directory, `_${componentRoot}-properties.scss`),
  ];
  const scriptSource = regionContents(source, 'script', 0);
  const extracted = extractCssMacros(scriptSource);
  const moduleCssPath = path.join(directory, `${componentRoot}.module.css`);
  const style = existsSync(moduleCssPath)
    ? readFileSync(moduleCssPath, 'utf8').trim()
    : regionContents(source, 'style').trim() || extracted.css;
  const normalized = extractTemplate(extracted.source);
  const script = normalizeSourceImports(normalized.source)
    .replace(/^\s*import\s+["'][^"']+\.module\.(?:css|scss)["']\s+as\s+styles;?\s*$/gmu, '')
    .trim();
  const existingTemplate = regionContents(source, 'template').trim();
  const template = normalized.template ?? existingTemplate ?? '';
  writeFileSync(
    filePath,
    `<script>\n${script}\n</script>\n<template>\n${template}\n</template>\n<style>\n${style}\n</style>\n`,
    'utf8',
  );
  for (const legacy of legacyFiles) {
    if (existsSync(legacy)) rmSync(legacy);
  }
  return true;
}

let migrated = 0;
for (const root of roots) {
  const rootPath = path.join(repositoryRoot, root);
  if (!existsSync(rootPath)) continue;
  for (const filePath of walk(rootPath).filter((file) => file.endsWith('.flintc'))) {
    if (migrate(filePath)) migrated += 1;
  }
}
console.log(`Migrated ${migrated} Flint components to explicit regions.`);
