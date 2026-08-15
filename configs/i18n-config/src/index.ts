import i18nextVuePlugin from 'i18next-cli-vue';

export interface I18nConfigOptions {
  locales?: string[];
  defaultLocale?: string;
  [key: string]: unknown;
}

export interface I18nConfig {
  defaultNS: string;
  locales: string[];
  defaultLocale: string;
  extract: {
    input: string;
    output: string;
    outputFormat: 'yaml';
    mergeNamespaces: boolean;
  };
  plugins: unknown[];
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
    extract: {
      input: 'src/**/*.{ts,tsx,vue}',
      output: 'src/locales/{{language}}.yaml',
      outputFormat: 'yaml',
      mergeNamespaces: true,
    },
    plugins: [i18nextVuePlugin()],
    ...rest,
  };
}
