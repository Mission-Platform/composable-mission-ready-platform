// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Internal types for locale message maps used by createMpI18n.

/** A single message value: a string, a nested object, or an array of values. */
export type MpMessageValue = string | MpMessageObject | MpMessageValue[];

/** A recursive message object supporting arbitrarily nested keys. */
export type MpMessageObject = { [key: string]: MpMessageValue };

/** A locale module: keys are locale codes, values are message objects. */
export type MpLocaleModule = Record<string, MpMessageObject>;

/** Per-locale message overrides passed directly to createMpI18n. */
export type MpLocales = Record<string, MpMessageObject>;

/**
 * A map of i18next namespaces (`mp.<workspace>`) to their per-locale messages.
 * Used by both the `namespaces` and `overrides` options of `createMpI18n`.
 */
export type MpNamespaceLocales = Record<string, MpLocales>;
