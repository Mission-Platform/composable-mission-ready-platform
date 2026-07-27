import { IconLanguage } from '@mission-platform/icons';
import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { BaseSelect } from '../base-select/base-select';

export interface LanguageSwitcherOption {
  code: string;
  label?: string;
  disabled?: boolean;
}

export interface LanguageSwitcherProperties extends MpProperties {
  locale: string;
  locales: readonly (string | LanguageSwitcherOption)[];
  label?: string;
  labelHidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  id?: string;
  onLocaleChange?: (locale: string) => void;
}

export function BaseLanguageSwitcher(properties: LanguageSwitcherProperties): MpElement {
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
    <BaseSelect
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
      <IconLanguage
        slot="start"
        size="sm"
      />
    </BaseSelect>
  );
}
