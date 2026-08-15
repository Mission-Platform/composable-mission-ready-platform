/**
 * Validate localized documentation trees under docs/locales/<locale>/.
 *
 * Checks:
 * - slug parity with the canonical English docs tree
 * - fenced code blocks remain byte-identical to English
 * - canonical source link resolves correctly
 * - body is not an English copy (heading/prose translation signal)
 *
 * Usage (from repo root):
 *   node --experimental-strip-types scripts/validate-doc-locales.ts
 */
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const docsRoot = join(root, 'docs');
const locales = ['ar', 'de', 'es', 'fr', 'he', 'it', 'ja', 'ko', 'nl', 'zh'] as const;

/** Common English function words used to detect untranslated Latin prose. */
const ENGLISH_FUNCTION_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'are',
  'is',
  'to',
  'of',
  'in',
  'on',
  'as',
  'by',
  'or',
  'an',
  'be',
  'use',
  'using',
  'when',
  'your',
  'into',
  'can',
  'all',
  'not',
  'have',
  'has',
  'will',
  'should',
  'must',
  'each',
  'their',
  'these',
  'those',
  'which',
  'while',
  'where',
  'before',
  'after',
  'between',
  'through',
  'about',
  'also',
  'only',
  'more',
  'than',
  'then',
  'them',
  'they',
  'you',
  'we',
  'it',
  'its',
  'a',
]);

async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'locales') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await markdownFiles(path)));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files.sort();
}

async function allMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await allMarkdownFiles(path)));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files.sort();
}

function fences(markdown: string): string[] {
  return markdown.match(/```[\s\S]*?```/g) ?? [];
}

function protectedTechnicalTokens(markdown: string): string[] {
  const tokens = new Set<string>();
  const withoutFences = markdown.replaceAll(/```[\s\S]*?```/g, ' ');

  for (const match of withoutFences.matchAll(/`[^`\n]+`/g)) {
    tokens.add(match[0] ?? '');
  }
  for (const match of withoutFences.matchAll(/@mission-platform\/[A-Za-z0-9._/-]+/g)) {
    tokens.add(match[0] ?? '');
  }
  for (const match of withoutFences.matchAll(/\B--[A-Za-z0-9][A-Za-z0-9-]*/g)) {
    tokens.add(match[0] ?? '');
  }
  for (const match of withoutFences.matchAll(
    /\b(?:pnpm|npm|npx|node|cargo|turbo|wrangler|vite|vitest|eslint|prettier|stylelint|typescript|vue|react|svelte|solid)\b/gi,
  )) {
    tokens.add(match[0] ?? '');
  }
  for (const match of withoutFences.matchAll(
    /\b[A-Za-z0-9_.-]+\.(?:json|jsonc|ts|tsx|vue|md|yaml|yml|toml|rs|wasm|css|scss|html)\b/g,
  )) {
    tokens.add(match[0] ?? '');
  }
  for (const match of withoutFences.matchAll(/https?:\/\/[^)\s>]+/g)) {
    tokens.add((match[0] ?? '').replace(/[.,;:!?`]+$/u, ''));
  }

  tokens.delete('');
  return [...tokens];
}

function slug(file: string, base: string): string {
  return relative(base, file).replace(/\.md$/u, '').replaceAll('\\', '/');
}

function stripFencesAndInlineCode(markdown: string): string {
  return markdown
    .replaceAll(/```[\s\S]*?```/g, ' ')
    .replaceAll(/`[^`\n]+`/g, ' ')
    .replaceAll(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replaceAll(/^>.*$/gm, ' ');
}

function extractBody(markdown: string): string {
  // Drop H1 and the provenance/source block that generators prepend.
  const withoutTitle = markdown.replace(/^#\s+.+\n+/m, '');
  const lines = withoutTitle.split('\n');
  let index = 0;
  // Skip leading blank lines and the first non-heading paragraph/blockquote block.
  while (index < lines.length && lines[index]?.trim() === '') index += 1;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (line.startsWith('#')) break;
    if (line.startsWith('>')) {
      index += 1;
      continue;
    }
    if (line.trim() === '') {
      index += 1;
      // stop after provenance paragraph + blank line once we already consumed text
      const prev = lines[index - 2] ?? '';
      if (prev.trim() !== '' && !prev.startsWith('>')) break;
      continue;
    }
    // first prose paragraph is provenance; skip it
    index += 1;
    while (index < lines.length && (lines[index] ?? '').trim() !== '' && !(lines[index] ?? '').startsWith('#')) {
      index += 1;
    }
    break;
  }
  while (index < lines.length && (lines[index] ?? '').trim() === '') index += 1;
  // also skip remaining blockquote source lines
  while (index < lines.length && ((lines[index] ?? '').startsWith('>') || (lines[index] ?? '').trim() === '')) {
    index += 1;
  }
  return lines.slice(index).join('\n');
}

function headings(markdown: string): string[] {
  return (markdown.match(/^#{2,6}\s+.+$/gm) ?? []).map((line) => line.replace(/^#{2,6}\s+/u, '').trim());
}

function latinWordTokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z]{2,}/g) ?? [];
}

function englishFunctionWordRatio(text: string): number {
  const tokens = latinWordTokens(text);
  if (tokens.length === 0) return 0;
  const hits = tokens.filter((token) => ENGLISH_FUNCTION_WORDS.has(token)).length;
  return hits / tokens.length;
}

function sharedHeadingRatio(englishHeadings: string[], localizedHeadings: string[]): number {
  if (englishHeadings.length === 0) return 0;
  const localized = new Set(localizedHeadings.map((value) => value.toLowerCase()));
  const shared = englishHeadings.filter((value) => localized.has(value.toLowerCase())).length;
  return shared / englishHeadings.length;
}

function isCjkOrRtlLocale(locale: string): boolean {
  return locale === 'ar' || locale === 'he' || locale === 'ja' || locale === 'ko' || locale === 'zh';
}

function assertTranslated(
  locale: string,
  pageSlug: string,
  canonical: string,
  localized: string,
  failures: string[],
): void {
  const englishBody = stripFencesAndInlineCode(extractBody(canonical));
  const localizedBody = stripFencesAndInlineCode(extractBody(localized));
  const englishHeadings = headings(canonical);
  const localizedHeadings = headings(localized);

  for (const token of protectedTechnicalTokens(canonical)) {
    if (!localized.includes(token)) {
      failures.push(`${locale}/${pageSlug}: protected technical token missing or changed: ${token}`);
    }
  }

  if (/[„“”«»]\s*\d+\s*[„“”«»]/u.test(localized) || /[「\[]\d+[」\]]/u.test(localized)) {
    failures.push(`${locale}/${pageSlug}: unresolved translated placeholder artifact`);
  }

  if (englishHeadings.length !== localizedHeadings.length) {
    failures.push(
      `${locale}/${pageSlug}: heading count mismatch (en=${englishHeadings.length}, locale=${localizedHeadings.length})`,
    );
  }

  const headingOverlap = sharedHeadingRatio(englishHeadings, localizedHeadings);
  // Allow some shared technical headings, but not a full English copy.
  if (englishHeadings.length >= 3 && headingOverlap > 0.75) {
    failures.push(
      `${locale}/${pageSlug}: ${Math.round(headingOverlap * 100)}% of headings are still identical English text`,
    );
  }

  const enRatio = englishFunctionWordRatio(englishBody);
  const locRatio = englishFunctionWordRatio(localizedBody);

  const nonLatinMatches =
    localizedBody.match(/[\u0400-\u04FF\u0600-\u06FF\u0590-\u05FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/gu) ?? [];
  const latinTokens = latinWordTokens(localizedBody);
  const nonLatinDensity = nonLatinMatches.length / Math.max(1, nonLatinMatches.length + latinTokens.length);

  if (isCjkOrRtlLocale(locale)) {
    const hasNonLatin = nonLatinMatches.length > 0;
    if (!hasNonLatin && localizedBody.trim().length > 80) {
      failures.push(`${locale}/${pageSlug}: expected non-Latin script in translated body`);
    }
    // Residual Latin tokens are expected (paths, product names). Fail only when non-Latin
    // script is sparse and English function words still dominate the Latin residue.
    if (hasNonLatin && nonLatinDensity < 0.2 && locRatio > 0.18 && locRatio > enRatio * 0.55) {
      failures.push(
        `${locale}/${pageSlug}: body still looks largely English (function-word ratio ${locRatio.toFixed(3)}, non-Latin density ${nonLatinDensity.toFixed(3)})`,
      );
    }
  } else {
    // Latin locales should reduce English function-word density substantially.
    if (enRatio > 0.12 && locRatio > enRatio * 0.72) {
      failures.push(
        `${locale}/${pageSlug}: body still looks largely English (function-word ratio ${locRatio.toFixed(3)} vs en ${enRatio.toFixed(3)})`,
      );
    }
  }

  // Reject the old stub pattern that only translated a title/intro.
  if (
    /reviewed translation/i.test(localized) ||
    /geprüfte Übersetzung der Mission-Platform-Dokumentation bewahrt Paketnamen/i.test(localized)
  ) {
    failures.push(`${locale}/${pageSlug}: contains obsolete stub provenance claiming a reviewed English-body copy`);
  }

  if (/\]\s+\(/.test(localized)) {
    failures.push(`${locale}/${pageSlug}: broken markdown link syntax: whitespace found between ] and (`);
  }
}

async function main(): Promise<void> {
  const canonicalFiles = await markdownFiles(docsRoot);
  const canonicalSlugs = canonicalFiles.map((file) => slug(file, docsRoot));
  const failures: string[] = [];

  for (const locale of locales) {
    const localeRoot = join(docsRoot, 'locales', locale);
    const localizedFiles = await allMarkdownFiles(localeRoot);
    const localizedSlugs = localizedFiles.map((file) => slug(file, localeRoot));
    const missing = canonicalSlugs.filter((value) => !localizedSlugs.includes(value));
    const extra = localizedSlugs.filter((value) => !canonicalSlugs.includes(value));
    if (missing.length > 0) failures.push(`${locale}: missing ${missing.join(', ')}`);
    if (extra.length > 0) failures.push(`${locale}: extra ${extra.join(', ')}`);

    for (const canonicalFile of canonicalFiles) {
      const pageSlug = slug(canonicalFile, docsRoot);
      const localizedFile = join(localeRoot, `${pageSlug}.md`);
      const [canonical, localized] = await Promise.all([
        readFile(canonicalFile, 'utf8'),
        readFile(localizedFile, 'utf8'),
      ]);
      const canonicalFences = fences(canonical);
      const localizedFences = fences(localized);
      if (JSON.stringify(canonicalFences) !== JSON.stringify(localizedFences)) {
        failures.push(`${locale}/${pageSlug}: fenced code blocks differ from canonical source`);
      }

      const sourceLink = localized.match(/\]\(([^)]+)\)/u)?.[1];
      if (!sourceLink) failures.push(`${locale}/${pageSlug}: missing canonical source link`);
      else if (resolve(dirname(localizedFile), sourceLink) !== canonicalFile) {
        failures.push(`${locale}/${pageSlug}: canonical source link does not resolve to ${pageSlug}.md`);
      }

      // Relative markdown/repo links must resolve from the locale file location.
      for (const match of localized.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const href = match[1] ?? '';
        if (!href || /^(https?:|mailto:|#)/.test(href)) continue;
        const pathPart = href.split('#')[0] ?? '';
        if (!pathPart) continue;
        const target = resolve(dirname(localizedFile), pathPart);
        try {
          await readFile(target);
        } catch {
          failures.push(`${locale}/${pageSlug}: unresolved relative link ${href}`);
        }
      }

      assertTranslated(locale, pageSlug, canonical, localized, failures);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Localized documentation validation failed:\n${failures.join('\n')}`);
  }
  console.log(`Validated ${canonicalSlugs.length} canonical slugs across ${locales.length} locales.`);
}

await main();
