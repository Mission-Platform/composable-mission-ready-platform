// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Internal types for locale message maps used by createForgeI18N.

/** A single message value: a string, a nested object, or an array of values. */
export type ForgeMessageValue = string | ForgeMessageObject | ForgeMessageValue[];

/** A recursive message object supporting arbitrarily nested keys. */
export type ForgeMessageObject = { [key: string]: ForgeMessageValue };

/** A locale module: keys are locale codes, values are message objects. */
export type ForgeLocaleModule = Record<string, ForgeMessageObject>;

/** Per-locale message overrides passed directly to createForgeI18N. */
export type ForgeLocales = Record<string, ForgeMessageObject>;

/**
 * A map of i18next namespaces (`mp.<workspace>`) to their per-locale messages.
 * Used by both the `namespaces` and `overrides` options of `createForgeI18N`.
 */
export type ForgeNamespaceLocales = Record<string, ForgeLocales>;
