/**
 * Generate localized documentation trees under docs/locales/<locale>/.
 *
 * Strategy:
 * - Keep English Markdown in docs/ as the canonical source.
 * - Split each page into fenced code vs non-fence segments; never send fences to MT.
 * - Within non-fence segments, protect inline code, link targets, package names, and
 *   CLI tokens; translate the remaining human-language text.
 * - Translate headings while preserving exact `#` markers and heading count.
 * - Write honest provenance notes (machine-assisted, not human-reviewed).
 *
 * Usage (from repo root):
 *   node --experimental-strip-types scripts/generate-doc-locales.ts
 *   node --experimental-strip-types scripts/generate-doc-locales.ts --locale=de --slug=overview
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const docsRoot = join(root, 'docs');
const locales = ['ar', 'de', 'es', 'fr', 'he', 'it', 'ja', 'ko', 'nl', 'zh'] as const;
type Locale = (typeof locales)[number];

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

const sleep = (ms: number) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

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

type Protected = { token: string; value: string };

const TOKEN_PREFIX = 'MPTOKEN';

type Segment = { kind: 'fence'; text: string } | { kind: 'text'; text: string };

function splitFenceSegments(source: string): Segment[] {
  const segments: Segment[] = [];
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

function protectInline(source: string): { text: string; protectedParts: Protected[] } {
  const protectedParts: Protected[] = [];
  let index = 0;
  const stash = (value: string): string => {
    // Keep placeholders as a single ASCII word. Punctuation-based sentinels
    // such as 「0」 are rewritten as localized quotation marks by MT engines.
    const token = `${TOKEN_PREFIX}${String(index).padStart(4, '0')}`;
    index += 1;
    protectedParts.push({ token, value });
    return token;
  };

  let text = source;
  // Inline code first.
  text = text.replaceAll(/`[^`\n]+`/g, (match) => stash(match));
  // Markdown images/links: protect destination, leave visible text for translation.
  text = text.replaceAll(/(!?\[[^\]]*\])\(([^)]+)\)/g, (_match, label: string, href: string) => {
    return `${label}(${stash(href)})`;
  });
  // Autolinks / bare HTML-ish tags.
  text = text.replaceAll(/<https?:\/\/[^>]+>/g, (match) => stash(match));
  text = text.replaceAll(/<\/?[a-zA-Z][^>]*>/g, (match) => stash(match));
  // Package names.
  text = text.replaceAll(/@mission-platform\/[A-Za-z0-9._/-]+/g, (match) => stash(match));
  // Common CLI / tooling tokens.
  text = text.replaceAll(
    /\b(?:pnpm|npm|npx|node|cargo|turbo|wrangler|vite|vitest|eslint|prettier|stylelint|typescript|vue|react|svelte|solid)\b/gi,
    (match) => stash(match),
  );

  return { text, protectedParts };
}

function chunkText(text: string, maxChars = 1400): string[] {
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

const translationCache = new Map<string, string>();

async function translateRaw(text: string, locale: Locale, attempt = 1): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  // Skip pure punctuation / placeholders / whitespace-only / non-linguistic remnants.
  if (!/[A-Za-z]{2,}/.test(trimmed)) return text;

  const cacheKey = `${locale}::${text}`;
  const cached = translationCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: locale,
    dt: 't',
    q: text,
  });
  const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MissionPlatformDocs/1.0)',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < 8) {
        await sleep(400 * attempt);
        return translateRaw(text, locale, attempt + 1);
      }
      throw new Error(`translate HTTP ${response.status} for locale=${locale}`);
    }
    const data = (await response.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      throw new TypeError(`unexpected translate payload for locale=${locale}`);
    }
    const translated = data[0]
      .map((part) => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : ''))
      .join('');

    const leading = text.match(/^\s*/)?.[0] ?? '';
    const trailing = text.match(/\s*$/)?.[0] ?? '';
    const result = `${leading}${translated.trim()}${trailing}`;
    translationCache.set(cacheKey, result);
    return result;
  } catch (error) {
    if (attempt < 8) {
      await sleep(350 * attempt);
      return translateRaw(text, locale, attempt + 1);
    }
    throw error;
  }
}

async function translatePlainText(text: string, locale: Locale): Promise<string> {
  const chunks = chunkText(text);
  const translatedChunks: string[] = [];
  for (const chunk of chunks) {
    translatedChunks.push(await translateRaw(chunk, locale));
    await sleep(20);
  }
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
async function translateProtectedText(source: string, locale: Locale): Promise<string> {
  const { text, protectedParts } = protectInline(source);
  const partsByToken = new Map(protectedParts.map((part) => [part.token, part.value]));
  const tokenPattern = new RegExp(String.raw`${TOKEN_PREFIX}\d{4}`, 'g');
  let cursor = 0;
  let translated = '';
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    let before = text.slice(cursor, match.index);
    let openingDelimiter = '';
    if (before.endsWith('`')) {
      openingDelimiter = '`';
      before = before.slice(0, -1);
    }
    translated += await translateUnprotectedText(before, locale);
    translated += openingDelimiter;
    const token = match[0];
    const value = partsByToken.get(token);
    if (value === undefined) throw new Error(`Unknown protected placeholder: ${token}`);
    translated += value;
    cursor = match.index + token.length;

    // Keep Markdown delimiters outside the MT boundary as well. In RTL/CJK
    // locales, a bare closing parenthesis/backtick may otherwise become a
    // locale punctuation character and corrupt a link or inline-code span.
    while (text[cursor] === ')' || text[cursor] === '`') {
      translated += text[cursor];
      cursor += 1;
    }
  }

  translated += await translateUnprotectedText(text.slice(cursor), locale);
  return translated;
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

  // Preserve exact leading/trailing newlines of the segment for fence adjacency.
  const leadingMatch = segment.match(/^\n*/);
  const trailingMatch = segment.match(/\n*$/);
  const leading = leadingMatch?.[0] ?? '';
  const trailing = trailingMatch?.[0] ?? '';
  const core = segment.slice(leading.length, segment.length - trailing.length);
  if (!core.trim()) return segment;

  const lines = core.split('\n');
  const translatedLines: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = async () => {
    if (paragraphBuffer.length === 0) return;
    const paragraph = paragraphBuffer.join('\n');
    paragraphBuffer = [];
    translatedLines.push(await translateProtectedText(paragraph, locale));
  };

  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) {
      await flushParagraph();
      translatedLines.push(await translateHeadingLine(line, locale));
      continue;
    }
    if (line.trim() === '') {
      await flushParagraph();
      translatedLines.push('');
      continue;
    }
    // Keep table separator rows untouched.
    if (/^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(line)) {
      await flushParagraph();
      translatedLines.push(line);
      continue;
    }
    paragraphBuffer.push(line);
  }
  await flushParagraph();

  // Ensure we didn't accidentally drop blank-line structure beyond the core split.
  return `${leading}${translatedLines.join('\n')}${trailing}`;
}

function rewriteRelativeLinks(markdown: string, sourcePath: string, outputPath: string): string {
  return markdown.replaceAll(/(!?\[[^\]]*\]\()([^)]+)(\))/g, (full, label: string, href: string, close: string) => {
    if (/^(https?:|mailto:|#)/.test(href)) return full;
    const hashIndex = href.indexOf('#');
    const pathPart = hashIndex === -1 ? href : href.slice(0, hashIndex);
    const anchor = hashIndex === -1 ? '' : href.slice(hashIndex);
    if (!pathPart) return full;
    const target = resolve(dirname(sourcePath), pathPart);
    let rewrittenTarget = target;
    const isDocsMarkdown = target.startsWith(docsRoot + '/') && target.endsWith('.md') && !target.includes('/locales/');
    if (isDocsMarkdown) {
      const relativeSlugPath = relative(docsRoot, target);
      const localeSegment = relative(join(docsRoot, 'locales'), outputPath).split('/')[0];
      if (localeSegment) {
        rewrittenTarget = join(docsRoot, 'locales', localeSegment, relativeSlugPath);
      }
    }
    const newPath = relative(dirname(outputPath), rewrittenTarget).replaceAll('\\', '/');
    return `${label}${newPath}${anchor}${close}`;
  });
}

async function translateMarkdownBody(body: string, locale: Locale): Promise<string> {
  const segments = splitFenceSegments(body);
  const out: string[] = [];
  for (const segment of segments) {
    if (segment.kind === 'fence') {
      out.push(segment.text);
      continue;
    }
    out.push(await translateTextSegment(segment.text, locale));
  }

  let restored = out.join('');
  // Safety net: never allow a closing fence to glue onto the next heading/paragraph.
  restored = restored.replaceAll(/```(#{1,6}\s)/g, '```\n\n$1');
  restored = restored.replaceAll(/```(\S)/g, (match, next: string, offset: number, whole: string) => {
    // Opening fences look like ```lang at line starts; only fix mid-stream glues after a prior newline content.
    const before = whole.slice(Math.max(0, offset - 1), offset);
    if (before === '\n' || before === '') return match;
    return `\`\`\`\n\n${next}`;
  });

  // Normalize only non-fence prose whitespace, then force original fences back byte-for-byte.
  const originalFences = body.match(/```[\s\S]*?```/g) ?? [];
  const parts = restored.split(/```[\s\S]*?```/g);
  const normalizedParts = parts.map((part) => part.replaceAll(/\n{4,}/g, '\n\n\n').replaceAll(/[ \t]+\n/g, '\n'));
  restored =
    originalFences.length === normalizedParts.length - 1
      ? normalizedParts
          .flatMap((part, index) => (index < originalFences.length ? [part, originalFences[index] ?? ''] : [part]))
          .join('')
      : restored.replaceAll(/\n{4,}/g, '\n\n\n');

  // Final pass: repair any whitespace corruption in markdown links
  // introduced by MT engines translating label text.
  restored = restored.replaceAll(/\]\s+\(/g, '](');

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

async function main(): Promise<void> {
  const sourcePaths = await collectMarkdown(docsRoot);
  const targetLocales = onlyLocale ? locales.filter((locale) => locale === onlyLocale) : [...locales];
  if (onlyLocale && targetLocales.length === 0) {
    throw new Error(`Unknown locale: ${onlyLocale}`);
  }

  let written = 0;
  for (const sourcePath of sourcePaths) {
    const relativeSlug = relative(docsRoot, sourcePath).replace(/\.md$/u, '').replaceAll('\\', '/');
    if (onlySlug && relativeSlug !== onlySlug) continue;

    const source = await readFile(sourcePath, 'utf8');
    const title = englishTitle(source, relativeSlug);
    const body = source.replace(/^#\s+.+\n*/m, '');

    await mapPool(targetLocales, 4, async (locale) => {
      const outputPath = join(docsRoot, 'locales', locale, `${relativeSlug}.md`);
      process.stdout.write(`translating ${locale}/${relativeSlug}...\n`);
      const localizedTitle = await translateTitle(title, locale);
      const localizedBody = rewriteRelativeLinks(await translateMarkdownBody(body, locale), sourcePath, outputPath);
      const { source: sourceLabel, locale: localeLabel } = labels[locale];
      const sourceLink = relative(dirname(outputPath), sourcePath).replaceAll('\\', '/');
      const content = [
        `# ${localizedTitle}`,
        '',
        provenance[locale],
        '',
        `> ${sourceLabel}: [docs/${relativeSlug}.md](${sourceLink})`,
        `> ${localeLabel}: ${localeNames[locale]} (${locale})`,
        '',
        localizedBody.replace(/^\n+/, ''),
      ]
        .join('\n')
        .replaceAll(/\n{3,}/g, '\n\n');

      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, content.endsWith('\n') ? content : `${content}\n`);
      written += 1;
    });
  }

  console.log(`Wrote ${written} localized documentation pages.`);
}

await main();
