// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Internal types for locale message maps used by createMpI18n.

/** A locale module: keys are locale codes, values are message objects. */
export type MpLocaleModule = Record<string, Record<string, string>>;

/** Per-locale message overrides passed directly to createMpI18n. */
export type MpLocales = Record<string, Record<string, string>>;
