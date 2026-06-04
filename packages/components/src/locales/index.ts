// ─── @mission-platform/components – locale module ───────────────────────────
// Import this module into `createMpI18n({ modules: [uiLocales] })` so that
// all UI component strings are registered in the app's i18n instance.
//
// To add a new language, extend the object with another locale key:
//   import { locales as uiLocales } from '@mission-platform/components/locales'
//   createMpI18n({ modules: [uiLocales, { fr: { required: 'requis' } }] })

/// <reference path="../yaml.d.ts" />

import { defineLocales } from '@mission-platform/i18n';

import en from './en.yaml';

export const locales = defineLocales({ en });
