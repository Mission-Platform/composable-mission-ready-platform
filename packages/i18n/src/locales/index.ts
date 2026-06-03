// ─── @mission-platform/i18n – locale module ──────────────────────────────────
// The base i18n package locale module for Mission Platform core strings.
// Import this via `@mission-platform/i18n/locales` and pass it to
// `createMpI18n({ modules: [baseLocales, ...] })` or `mergeLocales([...])`.

import { defineLocales } from '../define-locales'

import { en } from './en'

export const locales = defineLocales({ en: en as unknown as Record<string, string> })
