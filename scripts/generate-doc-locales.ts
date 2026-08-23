/**
 * Generate localized documentation trees beside each canonical docs root.
 *
 * Strategy:
 * - Keep English Markdown as the canonical source under each docs root.
 * - Split each page into fenced code vs non-fence segments; never send fences to MT.
 * - Within non-fence segments, protect inline code, link targets, package names, and
 *   CLI tokens; translate the remaining human-language text.
 * - Prefer remote machine translation (`DOCS_TRANSLATE_REMOTE=1`) for shipping output.
 * - Offline mode (`DOCS_TRANSLATE_OFFLINE=1`) is explicitly non-shipping and always
 *   stamps an unshippable marker that validation rejects.
 *
 * Usage (from repo root):
 *   DOCS_TRANSLATE_REMOTE=1 node --experimental-strip-types scripts/generate-doc-locales.ts
 *   DOCS_TRANSLATE_REMOTE=1 node --experimental-strip-types scripts/generate-doc-locales.ts --locale=de --slug=overview
 *   DOCS_TRANSLATE_REMOTE=1 node --experimental-strip-types scripts/generate-doc-locales.ts --resume
 */
import { createHash } from 'node:crypto';
import { existsSync, writeSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  DOCUMENTATION_LOCALES,
  UNSHIPPABLE_OFFLINE_MARKER,
  isAcceptableTranslation,
  protectInline,
  rewriteRelativeLinks,
  splitFenceSegments,
  type DocumentationLocale,
} from './doc-locales-lib.ts';
import {
  discoverDocumentationRoots,
  qualifiedSlug,
  type DocumentationSourceRoot,
} from './documentation-sources.ts';

/** Line-buffered logging so redirected resume runs remain observable. */
function logLine(message: string): void {
  writeSync(1, `${message}\n`);
}

const root = resolve(import.meta.dirname, '..');
const locales = DOCUMENTATION_LOCALES;
type Locale = DocumentationLocale;

const localeNames: Record<Locale, string> = {
  ar: 'العربية',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  he: 'עברית',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  nl: 'Nederlands',
  zh: '简体中文',
};

const provenance: Record<Locale, string> = {
  ar: 'ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.',
  de: 'Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.',
  es: 'Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.',
  fr: 'Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.',
  he: 'תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.',
  it: 'Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.',
  ja: '正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。',
  ko: '정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.',
  nl: 'Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.',
  zh: '由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。',
};

const labels: Record<Locale, { source: string; locale: string }> = {
  ar: { source: 'المصدر الإنجليزي', locale: 'اللغة' },
  de: { source: 'Englische Quelle', locale: 'Sprache' },
  es: { source: 'Fuente en inglés', locale: 'Idioma' },
  fr: { source: 'Source anglaise', locale: 'Langue' },
  he: { source: 'מקור באנגלית', locale: 'שפה' },
  it: { source: 'Fonte inglese', locale: 'Lingua' },
  ja: { source: '英語の原典', locale: '言語' },
  ko: { source: '영어 원문', locale: '언어' },
  nl: { source: 'Engelse bron', locale: 'Taal' },
  zh: { source: '英文原文', locale: '语言' },
};

const args = process.argv.slice(2);
const onlyLocale = args.find((value) => value.startsWith('--locale='))?.slice('--locale='.length) as Locale | undefined;
const onlySlug = args.find((value) => value.startsWith('--slug='))?.slice('--slug='.length);
const onlyPackage = args.find((value) => value.startsWith('--package='))?.slice('--package='.length);
const resume = args.includes('--resume');
const force = args.includes('--force');

const remoteEnabled = process.env.DOCS_TRANSLATE_REMOTE === '1';
const offlineEnabled = process.env.DOCS_TRANSLATE_OFFLINE === '1';

const sleep = (ms: number) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const cacheDirectory = join(root, 'node_modules', '.cache', 'doc-locales');
const cacheFilePath =
  process.env.DOCS_TRANSLATE_CACHE_FILE ??
  join(cacheDirectory, onlyLocale ? `translation-cache-${onlyLocale}.json` : 'translation-cache.json');
const memoryCache = new Map<string, string>();
const translationHosts = ['clients1', 'clients2', 'clients3', 'clients4', 'clients5'] as const;
let hostCursor = 0;
let consecutiveFailures = 0;
type ProviderName = 'google' | 'mymemory';

interface ProviderGate {
  queue: Promise<void>;
  lastCallAt: number;
  minIntervalMs: number;
  inFlight: number;
  maxInFlight: number;
  waiters: Array<() => void>;
}

const providerGates: Record<ProviderName, ProviderGate> = {
  google: { queue: Promise.resolve(), lastCallAt: 0, minIntervalMs: 70, inFlight: 0, maxInFlight: 3, waiters: [] },
  mymemory: { queue: Promise.resolve(), lastCallAt: 0, minIntervalMs: 60, inFlight: 0, maxInFlight: 3, waiters: [] },
};

async function withProviderSlot<T>(provider: ProviderName, work: () => Promise<T>): Promise<T> {
  const gate = providerGates[provider];
  while (gate.inFlight >= gate.maxInFlight) {
    await new Promise<void>((resolveWait) => {
      gate.waiters.push(resolveWait);
    });
  }
  gate.inFlight += 1;
  try {
    const wait = Math.max(0, gate.minIntervalMs - (Date.now() - gate.lastCallAt));
    if (wait > 0) await sleep(wait);
    gate.lastCallAt = Date.now();
    return await work();
  } finally {
    gate.inFlight -= 1;
    const next = gate.waiters.shift();
    if (next) next();
  }
}

async function loadDiskCache(): Promise<void> {
  if (!existsSync(cacheFilePath)) return;
  try {
    const raw = JSON.parse(await readFile(cacheFilePath, 'utf8')) as Record<string, string>;
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'string') memoryCache.set(key, value);
    }
  } catch {
    // Corrupt cache files are ignored; remote generation rebuilds entries.
  }
}

let cacheDirty = false;
async function persistDiskCache(): Promise<void> {
  if (!cacheDirty) return;
  await mkdir(cacheDirectory, { recursive: true });
  const payload = Object.fromEntries([...memoryCache.entries()].toSorted(([left], [right]) => left.localeCompare(right)));
  await writeFile(cacheFilePath, `${JSON.stringify(payload)}\n`, 'utf8');
  cacheDirty = false;
}

function cacheKey(locale: Locale, text: string): string {
  return `${locale}:${createHash('sha1').update(text).digest('hex')}`;
}

async function collectMarkdown(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'locales') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await collectMarkdown(path)));
    else if (entry.isFile() && entry.name.endsWith('.md')) paths.push(path);
  }
  return paths.sort();
}

interface DocumentationPage {
  readonly sourcePath: string;
  readonly sourceRoot: DocumentationSourceRoot;
  readonly localSlug: string;
  readonly qualifiedSlug: string;
}

async function collectDocumentationPages(documentationRoots: readonly DocumentationSourceRoot[]): Promise<DocumentationPage[]> {
  const pages: DocumentationPage[] = [];
  for (const sourceRoot of documentationRoots) {
    for (const sourcePath of await collectMarkdown(sourceRoot.rootDirectory)) {
      const localSlug = relative(sourceRoot.rootDirectory, sourcePath).replace(/\.md$/u, '').replaceAll('\\', '/');
      pages.push({
        sourcePath,
        sourceRoot,
        localSlug,
        qualifiedSlug: qualifiedSlug(sourceRoot, localSlug),
      });
    }
  }
  return pages.toSorted((left, right) => left.qualifiedSlug.localeCompare(right.qualifiedSlug));
}

function chunkText(text: string, maxChars = 1800): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxChars) {
    let splitAt = remaining.lastIndexOf('\n\n', maxChars);
    if (splitAt < maxChars * 0.35) splitAt = remaining.lastIndexOf('\n', maxChars);
    if (splitAt < maxChars * 0.35) splitAt = remaining.lastIndexOf(' ', maxChars);
    if (splitAt < maxChars * 0.35) splitAt = maxChars;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

/**
 * Deterministic non-shipping offline path. Intentionally leaves English prose
 * mostly intact and stamps an unshippable marker so validation always fails.
 */
function offlineTranslate(text: string, _locale: Locale): string {
  return text;
}

function myMemoryLocale(locale: Locale): string {
  if (locale === 'zh') return 'zh-CN';
  return locale;
}

function wrapPreservingWhitespace(source: string, translated: string): string {
  const leading = source.match(/^\s*/)?.[0] ?? '';
  const trailing = source.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated.trim()}${trailing}`;
}

async function translateViaGoogle(text: string, locale: Locale, attempt: number): Promise<string> {
  return withProviderSlot('google', async () => {
    const params = new URLSearchParams({
      client: 'dict-chrome-ex',
      sl: 'en',
      tl: locale,
      dt: 't',
      q: text,
    });
    const host = translationHosts[(hostCursor + attempt - 1) % translationHosts.length] ?? 'clients1';
    const url = `https://${host}.google.com/translate_a/t?${params.toString()}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MissionPlatformDocs/1.0)',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const error = new Error(`Google translation HTTP ${response.status} for locale=${locale}`) as Error & {
        status?: number;
      };
      error.status = response.status;
      throw error;
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data) || (typeof data[0] !== 'string' && !Array.isArray(data[0]))) {
      throw new TypeError(`unexpected Google translate payload for locale=${locale}`);
    }
    const translated =
      typeof data[0] === 'string'
        ? data.join('')
        : data[0].map((part) => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : '')).join('');
    hostCursor = (hostCursor + 1) % translationHosts.length;
    return wrapPreservingWhitespace(text, translated);
  });
}

async function translateViaMyMemory(text: string, locale: Locale): Promise<string> {
  // MyMemory free GET requests are most reliable under ~450 characters.
  if (text.trim().length > 450) {
    const parts = chunkText(text, 450);
    const translatedParts: string[] = [];
    for (const part of parts) {
      translatedParts.push(await translateViaMyMemory(part, locale));
    }
    return translatedParts.join('');
  }

  return withProviderSlot('mymemory', async () => {
    const params = new URLSearchParams({
      q: text,
      langpair: `en|${myMemoryLocale(locale)}`,
    });
    const response = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`, {
      signal: AbortSignal.timeout(20_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MissionPlatformDocs/1.0)',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const error = new Error(`MyMemory translation HTTP ${response.status} for locale=${locale}`) as Error & {
        status?: number;
      };
      error.status = response.status;
      throw error;
    }
    const data = (await response.json()) as {
      responseStatus?: number;
      responseData?: { translatedText?: string };
      quotaFinished?: boolean;
    };
    if (data.quotaFinished) {
      const error = new Error(`MyMemory quota finished for locale=${locale}`) as Error & { status?: number };
      error.status = 429;
      throw error;
    }
    if (data.responseStatus !== 200 || typeof data.responseData?.translatedText !== 'string') {
      throw new TypeError(`unexpected MyMemory payload for locale=${locale}`);
    }
    const translated = data.responseData.translatedText;
    if (translated.trim() === text.trim() && /[A-Za-z]{4,}/.test(text)) {
      const error = new Error(`MyMemory returned untranslated text for locale=${locale}`) as Error & { status?: number };
      error.status = 502;
      throw error;
    }
    return wrapPreservingWhitespace(text, translated);
  });
}

async function translateRawRemoteOnce(text: string, locale: Locale, attempt: number): Promise<string> {
  // Prefer Google (larger chunks, fewer round-trips). Fall back to MyMemory only
  // when Google is rate-limited or unavailable.
  try {
    return await translateViaGoogle(text, locale, attempt);
  } catch (googleError) {
    const status =
      typeof googleError === 'object' && googleError && 'status' in googleError
        ? Number((googleError as { status?: number }).status)
        : 0;
    if (status === 429 || status >= 500 || status === 0 || attempt > 1) {
      try {
        return await translateViaMyMemory(text, locale);
      } catch {
        throw googleError;
      }
    }
    throw googleError;
  }
}

async function translateRawRemote(text: string, locale: Locale, attempt = 1): Promise<string> {
  const key = cacheKey(locale, text);
  const cached = memoryCache.get(key);
  if (cached !== undefined) return cached;

  try {
    const result = await translateRawRemoteOnce(text, locale, attempt);
    consecutiveFailures = Math.max(0, consecutiveFailures - 1);
    memoryCache.set(key, result);
    cacheDirty = true;
    return result;
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status?: number }).status) : 0;
    const retryable = status === 429 || status >= 500 || status === 0;
    if (retryable && attempt < 12) {
      consecutiveFailures += 1;
      hostCursor = (hostCursor + 1) % translationHosts.length;
      const backoff = Math.min(12_000, 300 * 2 ** Math.min(attempt, 5) + consecutiveFailures * 80);
      await sleep(backoff);
      return translateRawRemote(text, locale, attempt + 1);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function translateRaw(text: string, locale: Locale): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  // Skip pure punctuation / placeholders / whitespace-only / non-linguistic remnants.
  if (!/[A-Za-z]{2,}/.test(trimmed)) return text;

  if (remoteEnabled) return translateRawRemote(text, locale);
  return offlineTranslate(text, locale);
}

async function translatePlainText(text: string, locale: Locale): Promise<string> {
  const chunks = chunkText(text);
  const translatedChunks = await Promise.all(chunks.map((chunk) => translateRaw(chunk, locale)));
  return translatedChunks.join('');
}

async function translateUnprotectedText(text: string, locale: Locale): Promise<string> {
  const linkPattern = /(!?\[)([^\]\n]*)(\]\()/g;
  let cursor = 0;
  let translated = '';
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(text)) !== null) {
    translated += await translatePlainText(text.slice(cursor, match.index), locale);
    translated += match[1] ?? '[';
    translated += await translatePlainText(match[2] ?? '', locale);
    translated += match[3] ?? '](';
    cursor = match.index + match[0].length;
  }

  translated += await translatePlainText(text.slice(cursor), locale);
  return translated;
}

/** Translate only human text; protected spans never cross the MT boundary. */
export async function translateProtectedText(source: string, locale: Locale): Promise<string> {
  const { text, protectedParts } = protectInline(source);
  if (protectedParts.length === 0) {
    return translateUnprotectedText(text, locale);
  }

  // Translate the full protected string in as few MT calls as possible. ASCII
  // placeholders (MPDOCTOKEN0001) survive the backends we use; restoring them
  // afterwards is far cheaper than one request per interstitial fragment.
  // Protected targets and inline code make the complete string safe to send in
  // one request: labels remain translatable while technical spans survive as
  // placeholders. Avoid splitting around every link, which serializes dozens
  // of requests on generated reference pages.
  let translated = await translatePlainText(text, locale);

  // Some engines insert spaces inside placeholders — normalize before restore.
  translated = translated.replaceAll(/MPDOCTOKEN\s*(\d{4})/gi, (_match, digits: string) => `MPDOCTOKEN${digits}`);

  let fallbackText: string | undefined;
  for (const part of [...protectedParts].toSorted((left, right) => right.token.length - left.token.length)) {
    if (!translated.includes(part.token)) {
      // Fallback: translate only the non-token spans if a placeholder was lost.
      const partsByToken = new Map(protectedParts.map((entry) => [entry.token, entry.value]));
      const tokenPattern = /MPDOCTOKEN\d{4}/g;
      let cursor = 0;
      let rebuilt = '';
      let match: RegExpExecArray | null;
      while ((match = tokenPattern.exec(text)) !== null) {
        rebuilt += await translateUnprotectedText(text.slice(cursor, match.index), locale);
        const value = partsByToken.get(match[0]);
        if (value === undefined) throw new Error(`Unknown protected placeholder: ${match[0]}`);
        rebuilt += value;
        cursor = match.index + match[0].length;
      }
      rebuilt += await translateUnprotectedText(text.slice(cursor), locale);
      fallbackText = rebuilt;
      break;
    }
    translated = translated.replaceAll(part.token, part.value);
  }

  translated = fallbackText ?? translated;
  for (const part of protectedParts) {
    if (!translated.includes(part.value)) translated = `${translated} ${part.value}`;
  }
  return translated.replaceAll(/\]\s+\(/g, '](');
}

async function translateHeadingLine(line: string, locale: Locale): Promise<string> {
  const match = /^(#{1,6})\s+(.*)$/.exec(line);
  if (!match) return line;
  const hashes = match[1] ?? '#';
  const title = match[2] ?? '';
  if (!title.trim()) return line;
  const translatedText = await translateProtectedText(title, locale);
  const translated = translatedText.trim();
  return `${hashes} ${translated || title}`;
}

async function translateTextSegment(segment: string, locale: Locale): Promise<string> {
  if (!segment.trim()) return segment;

  const leadingMatch = segment.match(/^\n*/);
  const trailingMatch = segment.match(/\n*$/);
  const leading = leadingMatch?.[0] ?? '';
  const trailing = trailingMatch?.[0] ?? '';
  const core = segment.slice(leading.length, segment.length - trailing.length);
  if (!core.trim()) return segment;

  const lines = core.split('\n');
  const translatedLines: string[] = [];
  let textBuffer: string[] = [];
  let textBufferLength = 0;

  const flushText = async () => {
    if (textBuffer.length === 0) return;
    translatedLines.push(await translateProtectedText(textBuffer.join('\n'), locale));
    textBuffer = [];
    textBufferLength = 0;
  };

  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) {
      await flushText();
      translatedLines.push(await translateHeadingLine(line, locale));
      continue;
    }
    if (line.trim() === '') {
      textBuffer.push(line);
      textBufferLength += 1;
      continue;
    }
    // Keep table separator rows untouched.
    if (/^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(line)) {
      await flushText();
      translatedLines.push(line);
      continue;
    }
    if (textBufferLength > 0 && textBufferLength + line.length + 1 > 1800) await flushText();
    textBuffer.push(line);
    textBufferLength += line.length + 1;
  }
  await flushText();

  return `${leading}${translatedLines.join('\n')}${trailing}`;
}

async function translateMarkdownBody(body: string, locale: Locale): Promise<string> {
  const segments = splitFenceSegments(body);
  const out = await Promise.all(
    segments.map((segment) => (segment.kind === 'fence' ? segment.text : translateTextSegment(segment.text, locale))),
  );

  let restored = out.join('');
  restored = restored.replaceAll(/```(#{1,6}\s)/g, '```\n\n$1');
  restored = restored.replaceAll(/```(\S)/g, (match, next: string, offset: number, whole: string) => {
    const before = whole.slice(Math.max(0, offset - 1), offset);
    if (before === '\n' || before === '') return match;
    return `\`\`\`\n\n${next}`;
  });

  const originalFences = body.match(/```[\s\S]*?```/g) ?? [];
  const parts = restored.split(/```[\s\S]*?```/g);
  const normalizedParts = parts.map((part) => part.replaceAll(/\n{4,}/g, '\n\n\n').replaceAll(/[ \t]+\n/g, '\n'));
  restored =
    originalFences.length === normalizedParts.length - 1
      ? normalizedParts
          .flatMap((part, index) => (index < originalFences.length ? [part, originalFences[index] ?? ''] : [part]))
          .join('')
      : restored.replaceAll(/\n{4,}/g, '\n\n\n');

  restored = splitFenceSegments(restored)
    .map((segment) => (segment.kind === 'fence' ? segment.text : segment.text.replaceAll(/\]\s+\(/g, '](')))
    .join('');

  return restored;
}

function englishTitle(source: string, fallback: string): string {
  return source.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

async function translateTitle(title: string, locale: Locale): Promise<string> {
  const translatedText = await translateProtectedText(title, locale);
  const translated = translatedText.trim();
  return translated || title;
}

async function mapPool<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = Array.from<R>({ length: items.length });
  let nextIndex = 0;
  async function run(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current] as T);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

function isGeneratedReference(sourcePath: string): boolean {
  return sourcePath.includes(`${join('reference', 'generated')}`);
}

async function shouldSkipExisting(
  outputPath: string,
  canonical: string,
  locale: Locale,
): Promise<boolean> {
  if (force || !resume || !existsSync(outputPath)) return false;
  try {
    const existing = await readFile(outputPath, 'utf8');
    return isAcceptableTranslation(locale, canonical, existing, {
      checkProseQuality: !isGeneratedReference(outputPath),
    });
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  if (!remoteEnabled && !offlineEnabled) {
    throw new Error(
      [
        'Refusing to generate documentation locales without an explicit translation backend.',
        'Set DOCS_TRANSLATE_REMOTE=1 for shipping machine translation, or',
        'DOCS_TRANSLATE_OFFLINE=1 for non-shipping placeholders that fail validation.',
      ].join(' '),
    );
  }
  if (remoteEnabled && offlineEnabled) {
    throw new Error('Set only one of DOCS_TRANSLATE_REMOTE=1 or DOCS_TRANSLATE_OFFLINE=1.');
  }

  if (remoteEnabled) await loadDiskCache();

  const documentationRoots = discoverDocumentationRoots(root);
  const sourcePages = await collectDocumentationPages(documentationRoots);
  const targetLocales = onlyLocale ? locales.filter((locale) => locale === onlyLocale) : [...locales];
  if (onlyLocale && targetLocales.length === 0) {
    throw new Error(`Unknown locale: ${onlyLocale}`);
  }

  const sourceCacheSeed = new Map<string, string>();
  const jobs: { page: DocumentationPage; locale: Locale; sourceBytes: number }[] = [];
  for (const page of sourcePages) {
    if (onlyPackage && page.sourceRoot.routePrefix !== onlyPackage) continue;
    if (onlySlug && page.qualifiedSlug !== onlySlug && page.localSlug !== onlySlug) continue;
    const source = await readFile(page.sourcePath, 'utf8');
    sourceCacheSeed.set(page.sourcePath, source);
    const sourceBytes = Buffer.byteLength(source, 'utf8');
    for (const locale of targetLocales) jobs.push({ page, locale, sourceBytes });
  }
  // Translate short hand-authored guides before large generated API pages so the
  // bulk of user-facing docs land first and cache warms on repeated phrases.
  jobs.sort((left, right) => {
    const leftGenerated = isGeneratedReference(left.page.sourcePath) ? 1 : 0;
    const rightGenerated = isGeneratedReference(right.page.sourcePath) ? 1 : 0;
    if (leftGenerated !== rightGenerated) return leftGenerated - rightGenerated;
    if (left.sourceBytes !== right.sourceBytes) return left.sourceBytes - right.sourceBytes;
    return `${left.page.qualifiedSlug}:${left.locale}`.localeCompare(`${right.page.qualifiedSlug}:${right.locale}`);
  });

  let written = 0;
  let skipped = 0;
  let processed = 0;
  const failures: string[] = [];
  const sourceCache = new Map<string, string>(sourceCacheSeed);

  // Page jobs run in parallel; provider gates limit the actual MT fan-out.
  const concurrency = remoteEnabled ? 6 : 8;
  await mapPool(jobs, concurrency, async ({ page, locale }) => {
    let source = sourceCache.get(page.sourcePath);
    if (source === undefined) {
      source = await readFile(page.sourcePath, 'utf8');
      sourceCache.set(page.sourcePath, source);
    }
    const title = englishTitle(source, page.localSlug);
    const body = source.replace(/^#\s+.+\n*/m, '');
    const generatedReference = isGeneratedReference(page.sourcePath);
    const outputPath = join(page.sourceRoot.rootDirectory, 'locales', locale, `${page.localSlug}.md`);

    if (await shouldSkipExisting(outputPath, source, locale)) {
      skipped += 1;
      logLine(`skip ${locale}/${page.qualifiedSlug} (acceptable existing translation)`);
      return;
    }

    logLine(`translating ${locale}/${page.qualifiedSlug}...`);
    try {
      const localizedTitle = await translateTitle(title, locale);
      const localizedBody = rewriteRelativeLinks(
        await translateMarkdownBody(body, locale),
        page.sourcePath,
        outputPath,
        documentationRoots,
        locale,
      );
      const { locale: localeLabel } = labels[locale];
      const sourceLink = relative(dirname(outputPath), page.sourcePath).replaceAll('\\', '/');
      const sourceLabel = page.sourceRoot.workspaceDirectory
        ? `${page.sourceRoot.workspaceDirectory}/docs/${page.localSlug}.md`
        : `docs/${page.localSlug}.md`;
      const content = [
        `# ${localizedTitle}`,
        '',
        ...(offlineEnabled ? [UNSHIPPABLE_OFFLINE_MARKER, ''] : []),
        provenance[locale],
        '',
        `> ${sourceLabel}: [${sourceLabel}](${sourceLink})`,
        `> ${localeLabel}: ${localeNames[locale]} (${locale})`,
        '',
        localizedBody.replace(/^\n+/, ''),
      ]
        .join('\n')
        .replaceAll(/\n{3,}/g, '\n\n');

      // Shipping remote output must satisfy the same quality gates as validation.
      if (remoteEnabled) {
        const acceptable = isAcceptableTranslation(locale, source, content, {
          checkProseQuality: !generatedReference,
        });
        if (!acceptable) {
          const message = `${locale}/${page.qualifiedSlug}: remote translation failed quality checks`;
          failures.push(message);
          logLine(`fail ${message}`);
          return;
        }
      }

      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, content.endsWith('\n') ? content : `${content}\n`);
      written += 1;
      processed += 1;
      logLine(`wrote ${locale}/${page.qualifiedSlug}`);
      if (remoteEnabled && processed % 15 === 0) await persistDiskCache();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${locale}/${page.qualifiedSlug}: ${message}`);
      logLine(`fail ${locale}/${page.qualifiedSlug}: ${message}`);
    }
  });

  if (remoteEnabled) await persistDiskCache();
  logLine(
    `Wrote ${written} localized documentation pages${skipped > 0 ? ` (skipped ${skipped} acceptable existing)` : ''}.`,
  );
  if (offlineEnabled) {
    logLine('Offline placeholders include UNSHIPPABLE_OFFLINE_TRANSLATION and will fail validate-doc-locales.');
  }
  if (failures.length > 0) {
    throw new Error(`Locale generation completed with ${failures.length} failure(s):\n${failures.slice(0, 50).join('\n')}`);
  }
}

// Re-export pure helpers used by unit tests.
export { protectInline, rewriteRelativeLinks, splitFenceSegments } from './doc-locales-lib.ts';

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
