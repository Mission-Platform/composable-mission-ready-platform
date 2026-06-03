// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Locale message shape used by Mission Platform UI components.
// All fields map to the vue-i18n message schema.

export interface MpMessages {
  /** Visible label for the required-field asterisk tooltip. */
  required: string
  /** Screen-reader label for the loading spinner inside a button. */
  loading: string
  /** Fallback aria-label for a close / dismiss action. */
  close: string
  /** Fallback aria-label for a search action. */
  search: string
  /** Fallback aria-label for expanding a panel. */
  expand: string
  /** Fallback aria-label for collapsing a panel. */
  collapse: string
}

export type MpLocales = Record<string, Partial<MpMessages>>

/**
 * A locale module contributed by a package or app.
 * Keys are locale codes (e.g. 'en', 'fr'); values are arbitrary message objects.
 * Multiple modules are deep-merged per locale inside `createMpI18n`.
 *
 * @example
 * // packages/components/src/locales/index.ts
 * export const locales: MpLocaleModule = {
 *   en: { required: 'required', loading: 'Loading…' },
 *   fr: { required: 'requis', loading: 'Chargement…' },
 * }
 */
export type MpLocaleModule = Record<string, Record<string, string>>
