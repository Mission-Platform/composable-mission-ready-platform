// A small, dependency-free client-side search engine for the documentation
// site. An inverted index is built once (at module load) from the same
// build-time `documents` manifest the rest of the app uses, so search always
// mirrors the canonical `docs/` Markdown with no extra fetch or copy step.
//
// The index maps each search term to the documents that contain it together
// with a per-document term frequency; queries are scored with a tf-idf ranking
// (title matches are boosted) and returned with a matching heading anchor and a
// contextual excerpt.

import { getDocuments, type DocumentEntry } from './documentation';
import { DEFAULT_LOCALE, type DocumentationLocale, SUPPORTED_LOCALES } from './i18n';

/** A single ranked search hit. */
export interface SearchResult {
  /** Slug of the matching document (used to build the in-app route). */
  slug: string;
  /** Human-readable document title. */
  title: string;
  /** Published package owning the page, when the result is package documentation. */
  packageName?: string;
  /** Text of the best-matching heading inside the document, when one matched. */
  heading?: string;
  /** Anchor id for {@link heading}, so results can deep-link to `/slug#id`. */
  headingId?: string;
  /** A short excerpt of body text surrounding the first match. */
  excerpt: string;
  /** Relevance score (higher is more relevant). */
  score: number;
}

/** A heading discovered inside a document, with its anchor id. */
interface Heading {
  text: string;
  id: string;
}

/** Pre-computed, searchable representation of a single document. */
interface IndexedDocument {
  slug: string;
  title: string;
  packageName?: string;
  /** Markdown stripped down to prose, used for excerpt generation. */
  plainText: string;
  /** Lower-cased copy of {@link plainText} for case-insensitive matching. */
  lowerText: string;
  headings: Heading[];
  /** Total token count, used to normalise term frequency. */
  tokenCount: number;
}

/** How much more a title token contributes to the score than a body token. */
const TITLE_BOOST = 6;
/** Minimum length for an indexed/queried token. */
const MIN_TOKEN_LENGTH = 1;
/** Approximate half-width (in characters) of a generated excerpt window. */
const EXCERPT_RADIUS = 90;

// Small conservative stop-word lists. Unknown languages are intentionally not
// filtered so search remains useful for Arabic, Hebrew, and CJK content.
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'this',
  'to',
  'was',
  'were',
  'will',
  'with',
  'und',
  'der',
  'die',
  'das',
  'ein',
  'eine',
  'ist',
  'zu',
  'de',
  'la',
  'el',
  'los',
  'las',
  'una',
  'un',
  'y',
  'en',
  'que',
  'le',
  'les',
  'des',
  'et',
  'une',
  'est',
  'pour',
  'dans',
]);

/** Convert heading text into a stable, URL-safe anchor id (mirrors the renderer). */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replaceAll(/[^\p{L}\p{N}_]+/gu, '-')
    .replaceAll(/^-+|-+$/g, '');
}

/** Split text into normalised, stop-word-filtered search tokens. */
function tokenize(text: string): string[] {
  const matches = text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return matches.flatMap((token) => {
    if (/[\u3400-\u9fff]/u.test(token)) {
      // Han-script text has no word boundaries. Indexing each character keeps
      // short queries such as `文档` useful inside a contiguous sentence.
      return [...token].filter((character) => character.length >= MIN_TOKEN_LENGTH);
    }
    return token.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(token) ? [token] : [];
  });
}

/** Reduce Markdown to plain prose suitable for excerpts and body indexing. */
function toPlainText(markdown: string): string {
  return markdown
    .replaceAll(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replaceAll(/`[^`]*`/g, ' ') // inline code
    .replaceAll(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replaceAll(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → link text
    .replaceAll(/^#{1,6}\s+/gm, '') // heading markers
    .replaceAll(/[*_~>#|]/g, ' ') // emphasis / blockquote / table / heading residue
    .replaceAll(/^\s*[-+]\s+/gm, ' ') // list bullets
    .replaceAll(/<[^>]+>/g, ' ') // inline HTML
    .replaceAll(/\s+/g, ' ')
    .trim();
}

/** Extract the `##`/`###`-style headings (with anchor ids) from Markdown. */
function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const counts = new Map<string, number>();
  const pattern = /^#{1,6}\s+(.+?)\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    const text = match[1].trim();
    const base = slugify(text);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    headings.push({ text, id: count > 0 ? `${base}-${count}` : base });
  }
  return headings;
}

function indexDocument(entry: DocumentEntry): IndexedDocument {
  const plainText = toPlainText(entry.source);
  return {
    slug: entry.slug,
    title: entry.title,
    packageName: entry.packageName,
    plainText,
    lowerText: plainText.toLowerCase(),
    headings: extractHeadings(entry.source),
    tokenCount: Math.max(tokenize(plainText).length, 1),
  };
}

interface LocaleIndex {
  documents: IndexedDocument[];
  inverted: Map<string, Map<string, number>>;
  bySlug: Map<string, IndexedDocument>;
}

function buildIndex(entries: Record<string, DocumentEntry>): LocaleIndex {
  const indexedDocuments = Object.values(entries).map((entry) => indexDocument(entry));
  const inverted = new Map<string, Map<string, number>>();
  const addPosting = (term: string, slug: string, weight: number): void => {
    let postings = inverted.get(term);
    if (!postings) {
      postings = new Map<string, number>();
      inverted.set(term, postings);
    }
    postings.set(slug, (postings.get(slug) ?? 0) + weight);
  };

  for (const document of indexedDocuments) {
    for (const token of tokenize(document.plainText)) addPosting(token, document.slug, 1 / document.tokenCount);
    for (const token of tokenize(document.title)) addPosting(token, document.slug, TITLE_BOOST / document.tokenCount);
  }
  return {
    documents: indexedDocuments,
    inverted,
    bySlug: new Map(indexedDocuments.map((document) => [document.slug, document])),
  };
}

const indexes = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [locale, buildIndex(getDocuments(locale))]),
) as Record<DocumentationLocale, LocaleIndex>;

/** Inverse document frequency for a term (rarer terms score higher). */
function idf(term: string, index: LocaleIndex): number {
  const documentFrequency = index.inverted.get(term)?.size ?? 0;
  if (documentFrequency === 0) return 0;
  return Math.log(1 + index.documents.length / documentFrequency);
}

/**
 * Resolve every indexed term relevant to a query token: an exact match plus any
 * term that starts with it, so partial words (e.g. `compos`) still match.
 */
function matchingTerms(queryToken: string, index: LocaleIndex): string[] {
  const terms: string[] = [];
  for (const term of index.inverted.keys()) {
    if (term === queryToken || term.startsWith(queryToken)) {
      terms.push(term);
    }
  }
  return terms;
}

/** Build a short excerpt around the first query-token occurrence in the body. */
function buildExcerpt(document: IndexedDocument, queryTokens: string[]): string {
  let earliest = -1;
  for (const token of queryTokens) {
    const position = document.lowerText.indexOf(token);
    if (position !== -1 && (earliest === -1 || position < earliest)) {
      earliest = position;
    }
  }

  const text = document.plainText;
  if (earliest === -1) {
    return text.length > EXCERPT_RADIUS * 2 ? `${text.slice(0, EXCERPT_RADIUS * 2).trimEnd()}…` : text;
  }

  const start = Math.max(0, earliest - EXCERPT_RADIUS);
  const end = Math.min(text.length, earliest + EXCERPT_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

/** Pick the first heading whose text contains one of the query tokens. */
function matchingHeading(document: IndexedDocument, queryTokens: string[]): Heading | undefined {
  return document.headings.find((heading) => {
    const lower = heading.text.toLowerCase();
    return queryTokens.some((token) => lower.includes(token));
  });
}

/**
 * Search the documentation index. Returns results ranked by relevance
 * (descending). An empty or whitespace-only query yields no results.
 */
export function search(query: string, limit?: number): SearchResult[];
export function search(query: string, locale: DocumentationLocale, limit?: number): SearchResult[];
export function search(
  query: string,
  locale: DocumentationLocale | number = DEFAULT_LOCALE,
  limit = 20,
): SearchResult[] {
  // Keep the old search(query, limit) call shape source-compatible.
  if (typeof locale === 'number') {
    limit = locale;
    locale = DEFAULT_LOCALE;
  }
  const index = indexes[locale];
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scores = new Map<string, number>();
  for (const queryToken of queryTokens) {
    for (const term of matchingTerms(queryToken, index)) {
      // Prefix (non-exact) matches contribute a little less than exact hits.
      const termWeight = term === queryToken ? 1 : 0.5;
      const termIdf = idf(term, index);
      const postings = index.inverted.get(term);
      if (!postings) continue;
      for (const [slug, frequency] of postings) {
        scores.set(slug, (scores.get(slug) ?? 0) + frequency * termIdf * termWeight);
      }
    }
  }

  return [...scores.entries()]
    .filter(([, score]) => score > 0)
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug, score]) => {
      const document = index.bySlug.get(slug)!;
      const heading = matchingHeading(document, queryTokens);
      return {
        slug,
        title: document.title,
        packageName: document.packageName,
        heading: heading?.text,
        headingId: heading?.id,
        excerpt: buildExcerpt(document, queryTokens),
        score,
      };
    });
}
