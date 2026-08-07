export const defaultLocale = 'en' as const;

export const supportedLocales = ['en', 'es', 'fr', 'nl', 'it', 'de', 'ko', 'ja', 'zh', 'ar', 'he'] as const;

export type SupportedLocale = (typeof supportedLocales)[number];
