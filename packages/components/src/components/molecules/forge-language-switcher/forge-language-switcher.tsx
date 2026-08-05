import { h, type MpElement, type MpProperties } from '@mission-platform/forge';
import { ForgeIconLanguage } from '@mission-platform/icons';

import { ForgeSelect } from '../forge-select/forge-select';

export interface ForgeLanguageSwitcherOption {
  code: string;
  label?: string;
  disabled?: boolean;
}

export interface ForgeLanguageSwitcherProperties extends MpProperties {
  locale: string;
  locales: readonly (string | ForgeLanguageSwitcherOption)[];
  label?: string;
  labelHidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  id?: string;
  onLocaleChange?: (locale: string) => void;
}

export function ForgeLanguageSwitcher(properties: Readonly<ForgeLanguageSwitcherProperties>): MpElement {
  const onLocaleChange = (value: string | number): void => {
    properties.onLocaleChange?.(String(value));
  };

  const formattedOptions = properties.locales.map((item) =>
    typeof item === 'string'
      ? { label: item.toUpperCase(), value: item }
      : {
          label: item.label ?? item.code.toUpperCase(),
          value: item.code,
          disabled: item.disabled,
        },
  );

  return (
    <ForgeSelect
      id={properties.id}
      disabled={properties.disabled}
      label={properties.label ?? 'Language'}
      labelHidden={properties.labelHidden ?? true}
      labelPosition="start"
      modelValue={properties.locale}
      options={formattedOptions}
      searchable={false}
      size={properties.size ?? 'sm'}
      onUpdateModelValue={onLocaleChange}
    >
      <ForgeIconLanguage
        slot="start"
        size="sm"
      />
    </ForgeSelect>
  );
}
