import { h, type MpElement } from '@mission-platform/forge';
import { ForgeIconLanguage } from '@mission-platform/icons';

export interface ForgeLanguageSwitcherOption {
  code: string;
  label?: string;
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

export function ForgeLanguageSwitcher(properties: Readonly<ForgeLanguageSwitcherProperties>): MpElement {
  const onLocaleChange = (event: Event): void => {
    properties.onLocaleChange?.((event.currentTarget as HTMLSelectElement).value);
  };

  return (
    <label for={properties.id}>
      <ForgeIconLanguage size="sm" />
      {properties.labelHidden === false ? (properties.label ?? 'Language') : undefined}
      <select
        id={properties.id}
        disabled={properties.disabled}
        value={properties.locale}
        onChange={onLocaleChange}
      >
        {properties.locales.map((item) => {
          const option = typeof item === 'string' ? { code: item, label: item.toUpperCase() } : item;
          return (
            <option
              disabled={option.disabled}
              value={option.code}
            >
              {option.label ?? option.code.toUpperCase()}
            </option>
          );
        })}
      </select>
    </label>
  );
}
