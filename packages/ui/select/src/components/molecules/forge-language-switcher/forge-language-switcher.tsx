import { ForgeIconFlag, ForgeIconLanguage, type IconCountryCode } from '@mission-platform/icons';

import { ForgeSelect } from '../forge-select';

import type { MpElement } from '@mission-platform/forge';

export interface ForgeLanguageSwitcherOption {
  code: string;
  label?: string;
  countryCode?: IconCountryCode;
  disabled?: boolean;
}

export interface ForgeLanguageSwitcherProperties {
  locale: string;
  locales: readonly (string | ForgeLanguageSwitcherOption)[];
  label?: string;
  labelHidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  id?: string;
  onLocaleChange?: (locale: string) => void;
}

const COUNTRY_CODES_BY_LANGUAGE: Readonly<Record<string, IconCountryCode>> = {
  ar: 'SA',
  de: 'DE',
  en: 'AU',
  es: 'ES',
  fr: 'FR',
  he: 'IL',
  hi: 'IN',
  it: 'IT',
  ja: 'JP',
  ko: 'KR',
  nl: 'NL',
  pt: 'BR',
  zh: 'CN',
};

const COUNTRY_CODES_BY_REGION: Readonly<Record<string, IconCountryCode>> = {
  AU: 'AU',
  BR: 'BR',
  CA: 'CA',
  CN: 'CN',
  DE: 'DE',
  ES: 'ES',
  FR: 'FR',
  GB: 'GB',
  IN: 'IN',
  IL: 'IL',
  IT: 'IT',
  JP: 'JP',
  KR: 'KR',
  NL: 'NL',
  SA: 'SA',
  US: 'US',
  ZA: 'ZA',
};

function resolveCountryCode(locale: string, countryCode?: IconCountryCode): IconCountryCode | undefined {
  if (countryCode) {
    return countryCode;
  }

  const localeParts = locale.trim().replaceAll('_', '-').split('-');
  const region = localeParts.at(-1)?.toUpperCase();
  return (
    (region ? COUNTRY_CODES_BY_REGION[region] : undefined) ??
    COUNTRY_CODES_BY_LANGUAGE[localeParts[0]?.toLowerCase() ?? '']
  );
}

export function ForgeLanguageSwitcher(properties: Readonly<ForgeLanguageSwitcherProperties>): MpElement {
  const options = properties.locales.map((item) => {
    const option = typeof item === 'string' ? { code: item, label: item.toUpperCase() } : item;
    const countryCode = resolveCountryCode(option.code, option.countryCode);

    return {
      disabled: option.disabled,
      icon: countryCode ? (
        <ForgeIconFlag
          size="sm"
          countryCode={countryCode}
        />
      ) : undefined,
      label: option.label ?? option.code.toUpperCase(),
      value: option.code,
    };
  });

  return (
    <ForgeSelect
      disabled={properties.disabled}
      id={properties.id}
      label={properties.label ?? 'Language'}
      labelHidden={properties.labelHidden ?? true}
      modelValue={properties.locale}
      options={options}
      searchable={false}
      size={properties.size}
      onUpdateModelValue={(value: string | number) => properties.onLocaleChange?.(String(value))}
    >
      <ForgeIconLanguage
        size="sm"
        slot="start"
      />
    </ForgeSelect>
  );
}
