// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// vue-i18n integration for Mission Platform UI components.

export type { MpMessages, MpLocales, MpLocaleModule } from './types'
export { createMpI18n } from './create-mp-i18n'
export { mergeLocales } from './merge-locales'
export { defineLocales } from './define-locales'

// Re-export useI18n so consumers only need one import.
export { useI18n } from 'vue-i18n'
