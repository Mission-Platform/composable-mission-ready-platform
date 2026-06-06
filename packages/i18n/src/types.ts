// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Internal types for locale message maps used by createMpI18n.

/** A single vue-i18n message value: a string or a nested message object. */
export type MpMessageValue = string | MpMessageObject;

/** A recursive message object supporting arbitrarily nested keys. */
export type MpMessageObject = { [key: string]: MpMessageValue };

/** A locale module: keys are locale codes, values are message objects. */
export type MpLocaleModule = Record<string, MpMessageObject>;

/** Per-locale message overrides passed directly to createMpI18n. */
export type MpLocales = Record<string, MpMessageObject>;
