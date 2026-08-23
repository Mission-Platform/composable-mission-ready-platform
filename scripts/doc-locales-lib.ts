/**
 * Shared pure helpers for documentation locale generation and validation.
 *
 * Keep Markdown ownership, fence protection, link rewriting, and translation
 * quality checks here so generator/validator/tests share one contract.
 */
import { dirname, join, relative, resolve } from 'node:path';

import { rootForPath, type DocumentationSourceRoot } from './documentation-sources.ts';

export const DOCUMENTATION_LOCALES = ['ar', 'de', 'es', 'fr', 'he', 'it', 'ja', 'ko', 'nl', 'zh'] as const;
export type DocumentationLocale = (typeof DOCUMENTATION_LOCALES)[number];

/** Marker written only by the non-shipping offline generator path. */
export const UNSHIPPABLE_OFFLINE_MARKER = '<!-- UNSHIPPABLE_OFFLINE_TRANSLATION -->';

/**
 * Canned phrases previously injected by the offline few-word / marker path.
 * Shipping locale pages must never contain these.
 */
export const OFFLINE_FABRICATION_MARKERS = [
  UNSHIPPABLE_OFFLINE_MARKER,
  'هذا النص مترجم إلى العربية',
  'טקסט זה מתורגם לעברית',
  'このテキストは日本語に翻訳されています',
  '이 텍스트는 한국어로 번역되었습니다',
  '此文本已翻译成简体中文',
  '此文档已翻译成简体中文',
] as const;

/** Common English function words used to detect untranslated Latin prose. */
export const ENGLISH_FUNCTION_WORDS = new Set([
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
  'do',
  'does',
  'did',
  'was',
  'were',
  'been',
  'being',
  'own',
  'owns',
  'owned',
  'over',
  'under',
  'such',
  'any',
  'both',
  'other',
  'some',
  'same',
  'how',
  'what',
  'who',
  'whom',
  'why',
  'if',
  'so',
  'no',
  'nor',
  'too',
  'very',
  'just',
  'than',
]);

const TOKEN_PREFIX = 'MPDOCTOKEN';

export interface FenceSegment {
  readonly kind: 'text' | 'fence';
  readonly text: string;
}

export interface ProtectedInline {
  readonly text: string;
  readonly protectedParts: readonly { readonly token: string; readonly value: string }[];
}

export interface TranslationQualityIssue {
  readonly code:
    | 'fabrication-marker'
    | 'placeholder-artifact'
    | 'heading-count'
    | 'missing-non-latin'
    | 'low-non-latin-density'
    | 'english-function-words'
    | 'english-content-retention'
    | 'heading-overlap'
    | 'obsolete-stub'
    | 'broken-link-syntax';
  readonly message: string;
}

/** Split Markdown into fenced code blocks and surrounding prose. */
export function splitFenceSegments(source: string): FenceSegment[] {
  const segments: FenceSegment[] = [];
  const pattern = /```[\s\S]*?```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', text: source.slice(lastIndex, match.index) });
    }
    segments.push({ kind: 'fence', text: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < source.length) {
    segments.push({ kind: 'text', text: source.slice(lastIndex) });
  }
  return segments;
}

/**
 * Protect inline code, link targets, package names, and CLI tokens so MT cannot
 * rewrite technical identifiers. Placeholders stay ASCII word-shaped.
 */
export function protectInline(source: string): ProtectedInline {
  const protectedParts: { token: string; value: string }[] = [];
  let index = 0;
  const stash = (value: string): string => {
    const token = `${TOKEN_PREFIX}${String(index).padStart(4, '0')}`;
    index += 1;
    protectedParts.push({ token, value });
    return token;
  };

  let text = source;
  text = text.replaceAll(/`[^`\n]+`/g, (match) => stash(match));
  text = text.replaceAll(/<!--[\s\S]*?-->/g, (match) => stash(match));
  text = text.replaceAll(/(!?\[[^\]]*\])\(([^)]+)\)/g, (_match, label: string, href: string) => {
    return `${label}(${stash(href)})`;
  });
  text = text.replaceAll(/<https?:\/\/[^>]+>/g, (match) => stash(match));
  text = text.replaceAll(/https?:\/\/[^\s)]+/g, (match) => stash(match));
  text = text.replaceAll(/<\/?[a-zA-Z][^>]*>/g, (match) => stash(match));
  text = text.replaceAll(/@mission-platform\/[A-Za-z0-9._/-]+/g, (match) => stash(match));
  text = text.replaceAll(
    /\b(?:pnpm|npm|npx|node|cargo|turbo|wrangler|vite|vitest|eslint|prettier|stylelint|typescript|vue|react|svelte|solid)\b/gi,
    (match) => stash(match),
  );

  return { text, protectedParts };
}

/** Restore protected placeholders after translation. */
export function restoreProtected(text: string, protectedParts: ProtectedInline['protectedParts']): string {
  let restored = text;
  // Restore longer tokens first so partial numeric collisions cannot occur.
  for (const part of [...protectedParts].toSorted((left, right) => right.token.length - left.token.length)) {
    restored = restored.replaceAll(part.token, part.value);
  }
  return restored;
}

/**
 * Rewrite relative Markdown/repo links from a locale page back to the correct
 * package-local locale path or repository-relative target.
 */
export function rewriteRelativeLinks(
  markdown: string,
  sourcePath: string,
  outputPath: string,
  documentationRoots: readonly DocumentationSourceRoot[],
  locale: string,
): string {
  return splitFenceSegments(markdown)
    .map((segment) => {
      if (segment.kind === 'fence') return segment.text;
      return segment.text.replaceAll(/(!?\[[^\]]*\]\()([^)]+)(\))/g, (full, label: string, href: string, close: string) => {
        if (/^(https?:|mailto:|#)/.test(href)) return full;
        const hashIndex = href.indexOf('#');
        const pathPart = hashIndex === -1 ? href : href.slice(0, hashIndex);
        const anchor = hashIndex === -1 ? '' : href.slice(hashIndex);
        if (!pathPart) return full;
        const target = resolve(dirname(sourcePath), pathPart);
        let rewrittenTarget = target;
        const targetRoot = target.endsWith('.md') ? rootForPath(target, documentationRoots) : undefined;
        if (targetRoot !== undefined) {
          const localeRoot = join(targetRoot.rootDirectory, 'locales');
          const alreadyLocalized = target === localeRoot || target.startsWith(`${localeRoot}${target.includes('\\') ? '\\' : '/'}`);
          if (!alreadyLocalized) {
            rewrittenTarget = join(localeRoot, locale, relative(targetRoot.rootDirectory, target));
          }
        }
        const newPath = relative(dirname(outputPath), rewrittenTarget).replaceAll('\\', '/');
        return `${label}${newPath}${anchor}${close}`;
      });
    })
    .join('');
}

export function withoutFences(markdown: string): string {
  return markdown.replaceAll(/```[\s\S]*?```/g, ' ');
}

export function stripFencesAndInlineCode(markdown: string): string {
  return markdown
    .replaceAll(/```[\s\S]*?```/g, ' ')
    .replaceAll(/`[^`\n]+`/g, ' ')
    .replaceAll(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replaceAll(/^>.*$/gm, ' ');
}

/**
 * Strip API-reference chrome so quality checks score human prose rather than
 * untranslatable identifiers, kinds, and signature tables.
 */
export function stripGeneratedApiChrome(markdown: string): string {
  return stripFencesAndInlineCode(markdown)
    .replaceAll(/<!--[\s\S]*?-->/g, ' ')
    .replaceAll(/^#{1,6}\s+.*$/gm, ' ')
    .replaceAll(/\*\*Kind:\*\*\s+\w+/gi, ' ')
    .replaceAll(/^\|\s*Name\s*\|\s*Type\s*\|\s*Description\s*\|.*$/gim, ' ')
    .replaceAll(/^\|[\s:-|]+\|$/gm, ' ')
    .replaceAll(/^\|.*\|$/gm, ' ')
    .replaceAll(/\b[A-Z][A-Za-z0-9]+(?:[A-Z][A-Za-z0-9]+)+\b/g, ' ')
    .replaceAll(/\b[a-z]+(?:[A-Z][A-Za-z0-9]+)+\b/g, ' ')
    .replaceAll(/\b[A-Z][A-Z0-9_]{2,}\b/g, ' ')
    .replaceAll(/\{@link\s+[^}]+\}/g, ' ');
}

/** Drop H1 plus generator provenance/source blockquotes from a locale page. */
export function extractBody(markdown: string): string {
  const withoutTitle = markdown.replace(/^#\s+.+\n+/m, '');
  const lines = withoutTitle.split('\n');
  let index = 0;
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
      const prev = lines[index - 2] ?? '';
      if (prev.trim() !== '' && !prev.startsWith('>')) break;
      continue;
    }
    index += 1;
    while (index < lines.length && (lines[index] ?? '').trim() !== '' && !(lines[index] ?? '').startsWith('#')) {
      index += 1;
    }
    break;
  }
  while (index < lines.length && (lines[index] ?? '').trim() === '') index += 1;
  while (index < lines.length && ((lines[index] ?? '').startsWith('>') || (lines[index] ?? '').trim() === '')) {
    index += 1;
  }
  return lines.slice(index).join('\n');
}

export function headings(markdown: string): string[] {
  return (markdown.match(/^#{2,6}\s+.+$/gm) ?? []).map((line) => line.replace(/^#{2,6}\s+/u, '').trim());
}

export function latinWordTokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z]{2,}/g) ?? [];
}

export function englishFunctionWordRatio(text: string): number {
  const tokens = latinWordTokens(text);
  if (tokens.length === 0) return 0;
  const hits = tokens.filter((token) => ENGLISH_FUNCTION_WORDS.has(token)).length;
  return hits / tokens.length;
}

/** Content words are longer Latin tokens that are not English function words. */
export function englishContentWords(text: string): string[] {
  return latinWordTokens(text).filter((token) => token.length >= 4 && !ENGLISH_FUNCTION_WORDS.has(token));
}

/**
 * Fraction of English content words that still appear in the localized body.
 * High retention means the page is still largely English prose.
 */
export function englishContentRetention(englishBody: string, localizedBody: string): number {
  const english = [...new Set(englishContentWords(englishBody))];
  if (english.length < 8) return 0;
  const localized = new Set(englishContentWords(localizedBody));
  const retained = english.filter((token) => localized.has(token)).length;
  return retained / english.length;
}

export function sharedHeadingRatio(englishHeadings: string[], localizedHeadings: string[]): number {
  if (englishHeadings.length === 0) return 0;
  const localized = new Set(localizedHeadings.map((value) => value.toLowerCase()));
  const shared = englishHeadings.filter((value) => localized.has(value.toLowerCase())).length;
  return shared / englishHeadings.length;
}

export function isCjkOrRtlLocale(locale: string): boolean {
  return locale === 'ar' || locale === 'he' || locale === 'ja' || locale === 'ko' || locale === 'zh';
}

export function protectedTechnicalTokens(markdown: string): string[] {
  const tokens = new Set<string>();
  const prose = withoutFences(markdown);

  for (const match of prose.matchAll(/`[^`\n]+`/g)) tokens.add(match[0] ?? '');
  for (const match of prose.matchAll(/@mission-platform\/[A-Za-z0-9._/-]+/g)) tokens.add(match[0] ?? '');
  for (const match of prose.matchAll(/\B--[A-Za-z0-9][A-Za-z0-9-]*/g)) tokens.add(match[0] ?? '');
  for (const match of prose.matchAll(
    /\b(?:pnpm|npm|npx|node|cargo|turbo|wrangler|vite|vitest|eslint|prettier|stylelint|typescript|vue|react|svelte|solid)\b/gi,
  )) {
    tokens.add(match[0] ?? '');
  }
  for (const match of prose.matchAll(
    /\b[A-Za-z0-9_.-]+\.(?:json|jsonc|ts|tsx|vue|md|yaml|yml|toml|rs|wasm|css|scss|html)\b/g,
  )) {
    tokens.add(match[0] ?? '');
  }
  for (const match of prose.matchAll(/https?:\/\/[^)\s>]+/g)) {
    tokens.add((match[0] ?? '').replace(/[.,;:!?`]+$/u, ''));
  }

  tokens.delete('');
  return [...tokens];
}

/**
 * Assess whether a localized page is a genuine translation rather than English
 * with offline fabrication markers or few-word substitution.
 */
export function assessTranslationQuality(
  locale: string,
  canonical: string,
  localized: string,
  options: { readonly checkProseQuality?: boolean } = {},
): TranslationQualityIssue[] {
  const checkProseQuality = options.checkProseQuality ?? true;
  const issues: TranslationQualityIssue[] = [];
  const englishBody = stripFencesAndInlineCode(extractBody(canonical));
  const localizedBody = stripFencesAndInlineCode(extractBody(localized));
  const englishHeadings = headings(canonical);
  const localizedHeadings = headings(localized);

  for (const marker of OFFLINE_FABRICATION_MARKERS) {
    if (localized.includes(marker)) {
      issues.push({
        code: 'fabrication-marker',
        message: `contains offline fabrication marker: ${marker}`,
      });
    }
  }

  if (/[„“”«»]\s*\d+\s*[„“”«»]/u.test(localized) || /「\d+」/u.test(localized)) {
    issues.push({
      code: 'placeholder-artifact',
      message: 'unresolved translated placeholder artifact',
    });
  }

  if (englishHeadings.length !== localizedHeadings.length) {
    issues.push({
      code: 'heading-count',
      message: `heading count mismatch (en=${englishHeadings.length}, locale=${localizedHeadings.length})`,
    });
  }

  if (
    /reviewed translation/i.test(localized) ||
    /geprüfte Übersetzung der Mission-Platform-Dokumentation bewahrt Paketnamen/i.test(localized)
  ) {
    issues.push({
      code: 'obsolete-stub',
      message: 'contains obsolete stub provenance claiming a reviewed English-body copy',
    });
  }

  if (/\]\s+\(/.test(withoutFences(localized))) {
    issues.push({
      code: 'broken-link-syntax',
      message: 'broken markdown link syntax: whitespace found between ] and (',
    });
  }

  const englishProse = checkProseQuality ? englishBody : stripGeneratedApiChrome(englishBody);
  const localizedProse = checkProseQuality ? localizedBody : stripGeneratedApiChrome(localizedBody);
  const enRatio = englishFunctionWordRatio(englishProse);
  const locRatio = englishFunctionWordRatio(localizedProse);
  const retention = englishContentRetention(englishProse, localizedProse);
  const nonLatinMatches =
    localizedProse.match(/[\u0400-\u04FF\u0600-\u06FF\u0590-\u05FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/gu) ?? [];
  const latinTokens = latinWordTokens(localizedProse);
  const nonLatinDensity = nonLatinMatches.length / Math.max(1, nonLatinMatches.length + latinTokens.length);
  const substantial = localizedProse.trim().length > 80;

  // Generated API pages: score description prose only (identifiers stay English).
  if (!checkProseQuality) {
    if (isCjkOrRtlLocale(locale)) {
      if (substantial && nonLatinMatches.length === 0) {
        issues.push({
          code: 'missing-non-latin',
          message: 'expected non-Latin script in translated generated page prose',
        });
      }
      if (substantial && nonLatinDensity < 0.25) {
        issues.push({
          code: 'low-non-latin-density',
          message: `generated page prose still looks largely English (non-Latin density ${nonLatinDensity.toFixed(3)})`,
        });
      }
    } else if (substantial && retention > 0.7) {
      issues.push({
        code: 'english-content-retention',
        message: `generated page prose retains too many English content words (${retention.toFixed(3)})`,
      });
    } else if (substantial && enRatio > 0.08 && locRatio > Math.max(0.1, enRatio * 0.7)) {
      issues.push({
        code: 'english-function-words',
        message: `generated page prose still looks largely English (function-word ratio ${locRatio.toFixed(3)} vs en ${enRatio.toFixed(3)})`,
      });
    }
    return issues;
  }

  let bodyLooksEnglish = false;

  if (isCjkOrRtlLocale(locale)) {
    if (substantial && nonLatinMatches.length === 0) {
      bodyLooksEnglish = true;
      issues.push({
        code: 'missing-non-latin',
        message: 'expected non-Latin script in translated body',
      });
    }
    // Real translations for these locales are dense in native script. A single
    // canned sentence glued onto English prose yields a very low density.
    if (substantial && nonLatinDensity < 0.35) {
      bodyLooksEnglish = true;
      issues.push({
        code: 'low-non-latin-density',
        message: `body still looks largely English (non-Latin density ${nonLatinDensity.toFixed(3)})`,
      });
    }
    if (substantial && retention > 0.45) {
      bodyLooksEnglish = true;
      issues.push({
        code: 'english-content-retention',
        message: `body retains too many English content words (${retention.toFixed(3)})`,
      });
    }
  } else {
    // Latin locales: few-word offline substitution only swaps function words, so
    // require both lower function-word density and real content-word translation.
    if (enRatio > 0.08 && locRatio > Math.max(0.08, enRatio * 0.55)) {
      bodyLooksEnglish = true;
      issues.push({
        code: 'english-function-words',
        message: `body still looks largely English (function-word ratio ${locRatio.toFixed(3)} vs en ${enRatio.toFixed(3)})`,
      });
    }
    if (retention > 0.5) {
      bodyLooksEnglish = true;
      issues.push({
        code: 'english-content-retention',
        message: `body retains too many English content words (${retention.toFixed(3)})`,
      });
    }
  }

  const headingOverlap = sharedHeadingRatio(englishHeadings, localizedHeadings);
  if (bodyLooksEnglish && englishHeadings.length >= 3 && headingOverlap > 0.75) {
    issues.push({
      code: 'heading-overlap',
      message: `${Math.round(headingOverlap * 100)}% of headings are still identical English text`,
    });
  }

  return issues;
}

/** True when assessTranslationQuality reports no blocking issues. */
export function isAcceptableTranslation(
  locale: string,
  canonical: string,
  localized: string,
  options: { readonly checkProseQuality?: boolean } = {},
): boolean {
  return assessTranslationQuality(locale, canonical, localized, options).length === 0;
}
