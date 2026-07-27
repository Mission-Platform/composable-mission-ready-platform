export interface I18nConfigOptions {
  locales?: string[];
  defaultLocale?: string;
  [key: string]: unknown;
}

export interface I18nConfig {
  defaultNS: string;
  locales: string[];
  defaultLocale: string;
  [key: string]: unknown;
}

export const SUPPORTED_LOCALES = ['en', 'ar', 'de', 'es', 'fr', 'he', 'it', 'ja', 'ko', 'nl', 'zh'] as const;
export const DEFAULT_LOCALE = 'en';

export function createI18nConfig(defaultNS: string, options: I18nConfigOptions = {}): I18nConfig {
  const { locales = [...SUPPORTED_LOCALES], defaultLocale = DEFAULT_LOCALE, ...rest } = options;
  return {
    defaultNS,
    locales,
    defaultLocale,
    ...rest,
  };
}
