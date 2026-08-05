// A small, dependency-free client-side search engine for the documentation
// site. An inverted index is built once (at module load) from the same
// build-time `documents` manifest the rest of the app uses, so search always
// mirrors the canonical `docs/` Markdown with no extra fetch or copy step.
//
// The index maps each search term to the documents that contain it together
// with a per-document term frequency; queries are scored with a tf-idf ranking
// (title matches are boosted) and returned with a matching heading anchor and a
// contextual excerpt.

import { documents, type DocumentEntry } from './documentation';

/** A single ranked search hit. */
export interface SearchResult {
  /** Slug of the matching document (used to build the in-app route). */
  slug: string;
  /** Human-readable document title. */
  title: string;
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
const MIN_TOKEN_LENGTH = 2;
/** Approximate half-width (in characters) of a generated excerpt window. */
const EXCERPT_RADIUS = 90;

// Very small English stop-word list. Filtering these keeps the index focused on
// meaningful terms without pulling in a heavyweight NLP dependency.
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
]);

/** Convert heading text into a stable, URL-safe anchor id (mirrors the renderer). */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replaceAll(/[^\w]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

/** Split text into normalised, stop-word-filtered search tokens. */
function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return matches.filter((token) => token.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(token));
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
  const pattern = /^#{1,6}\s+(.+?)\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    const text = match[1].trim();
    headings.push({ text, id: slugify(text) });
  }
  return headings;
}

function indexDocument(entry: DocumentEntry): IndexedDocument {
  const plainText = toPlainText(entry.source);
  return {
    slug: entry.slug,
    title: entry.title,
    plainText,
    lowerText: plainText.toLowerCase(),
    headings: extractHeadings(entry.source),
    tokenCount: Math.max(tokenize(plainText).length, 1),
  };
}

// --- Index construction (runs once at module load) ---------------------------

const indexedDocuments: IndexedDocument[] = Object.values(documents).map((entry) => indexDocument(entry));

/** term → (slug → weighted term frequency). */
const invertedIndex = new Map<string, Map<string, number>>();

function addPosting(term: string, slug: string, weight: number): void {
  let postings = invertedIndex.get(term);
  if (!postings) {
    postings = new Map<string, number>();
    invertedIndex.set(term, postings);
  }
  postings.set(slug, (postings.get(slug) ?? 0) + weight);
}

for (const document of indexedDocuments) {
  for (const token of tokenize(document.plainText)) {
    addPosting(token, document.slug, 1 / document.tokenCount);
  }
  // Title tokens are indexed with a strong boost so title hits rank first.
  for (const token of tokenize(document.title)) {
    addPosting(token, document.slug, TITLE_BOOST / document.tokenCount);
  }
}

const documentCount = indexedDocuments.length;
const documentsBySlug = new Map(indexedDocuments.map((document) => [document.slug, document]));

/** Inverse document frequency for a term (rarer terms score higher). */
function idf(term: string): number {
  const documentFrequency = invertedIndex.get(term)?.size ?? 0;
  if (documentFrequency === 0) return 0;
  return Math.log(1 + documentCount / documentFrequency);
}

/**
 * Resolve every indexed term relevant to a query token: an exact match plus any
 * term that starts with it, so partial words (e.g. `compos`) still match.
 */
function matchingTerms(queryToken: string): string[] {
  const terms: string[] = [];
  for (const term of invertedIndex.keys()) {
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
export function search(query: string, limit = 20): SearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scores = new Map<string, number>();
  for (const queryToken of queryTokens) {
    for (const term of matchingTerms(queryToken)) {
      // Prefix (non-exact) matches contribute a little less than exact hits.
      const termWeight = term === queryToken ? 1 : 0.5;
      const termIdf = idf(term);
      const postings = invertedIndex.get(term);
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
      const document = documentsBySlug.get(slug)!;
      const heading = matchingHeading(document, queryTokens);
      return {
        slug,
        title: document.title,
        heading: heading?.text,
        headingId: heading?.id,
        excerpt: buildExcerpt(document, queryTokens),
        score,
      };
    });
}
