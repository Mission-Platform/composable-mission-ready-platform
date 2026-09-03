/**
 * Pure text-statistics helpers for the WYSIWYG editor.
 *
 * These are intentionally DOM-free (regex-based) so they run identically on the
 * server, in the browser, and under unit tests, and so the editor's live
 * word/character counters are deterministic.
 */

/** Aggregate statistics for a piece of editor content. */
export interface EditorStats {
  /** Number of whitespace-delimited words. */
  readonly words: number;
  /** Number of characters (including whitespace). */
  readonly characters: number;
  /** Number of characters excluding all whitespace. */
  readonly charactersNoSpaces: number;
}

/** An `EditorStats` value representing empty content. */
export const EMPTY_EDITOR_STATS: EditorStats = {
  words: 0,
  characters: 0,
  charactersNoSpaces: 0,
};

const HTML_ENTITIES: Readonly<Record<string, string>> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

/**
 * Convert an HTML fragment to its visible plain text: block-level tags become a
 * single space (so adjacent blocks don't fuse words), all other tags are
 * dropped, a small set of common entities are decoded, and runs of whitespace
 * are collapsed. Pure and DOM-free.
 */
export function htmlToPlainText(html: string): string {
  if (html.length === 0) {
    return '';
  }
  const withBlockBreaks = html
    // Treat closing block tags and line breaks as word boundaries.
    .replaceAll(/<\/(?:p|div|li|h[1-6]|blockquote|pre|tr)>/gi, ' ')
    .replaceAll(/<br\s*\/?>/gi, ' ')
    // Drop every remaining tag.
    .replaceAll(/<[^>]*>/g, '');
  const decoded = withBlockBreaks.replaceAll(
    /&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/gi,
    (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? entity,
  );
  return decoded.replaceAll(/\s+/g, ' ').trim();
}

/** Count whitespace-delimited words in a plain-text string. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

/**
 * Compute {@link EditorStats} for an HTML fragment (the editor's model value).
 */
export function computeStats(html: string): EditorStats {
  const text = htmlToPlainText(html);
  return {
    words: countWords(text),
    characters: text.length,
    charactersNoSpaces: text.replaceAll(/\s/g, '').length,
  };
}
