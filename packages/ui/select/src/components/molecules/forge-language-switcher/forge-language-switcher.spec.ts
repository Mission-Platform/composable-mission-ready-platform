import { isMpElement, type MpElement } from '@mission-platform/forge';
import { describe, expect, it, vi } from 'vitest';

import { ForgeLanguageSwitcher } from './forge-language-switcher';

function selectElement(value: unknown): MpElement | undefined {
  if (!isMpElement(value)) return undefined;
  if ('options' in value.properties) return value;
  return value.children.map((child) => selectElement(child)).find((child) => child !== undefined);
}

describe('ForgeLanguageSwitcher', () => {
  it('maps locales to ForgeSelect options and keeps the language icon in the start slot', () => {
    const root = ForgeLanguageSwitcher({
      locale: 'en',
      locales: ['en', { code: 'fr', label: 'Français' }, { code: 'de', disabled: true }],
    });
    const element = selectElement(root);

    expect(root.properties).toHaveProperty('options');

    expect(element).toBeDefined();
    if (element === undefined) return;

    expect(element.properties).toMatchObject({
      label: 'Language',
      labelHidden: true,
      modelValue: 'en',
      searchable: false,
      options: [
        { value: 'en', label: 'EN', disabled: undefined },
        { value: 'fr', label: 'Français', disabled: undefined },
        { value: 'de', label: 'DE', disabled: true },
      ],
    });

    const options = element.properties.options as Array<{ icon?: unknown }>;
    expect(options.every((option) => isMpElement(option.icon))).toBe(true);
    const englishFlag = options[0]?.icon;
    if (isMpElement(englishFlag)) {
      expect(englishFlag.properties).toMatchObject({ countryCode: 'AU', size: 'sm' });
    }

    expect(element.children).toHaveLength(1);
    expect(isMpElement(element.children[0]) && element.children[0].properties.slot).toBe('start');
  });

  it('supports an explicit country flag for regional language variants', () => {
    const element = selectElement(
      ForgeLanguageSwitcher({
        locale: 'en-US',
        locales: [{ code: 'en-US', label: 'English (US)', countryCode: 'US' }],
      }),
    );

    expect(element).toBeDefined();
    if (element === undefined) return;

    const option = (element.properties.options as Array<{ icon?: unknown }>)[0];
    expect(isMpElement(option?.icon)).toBe(true);
    if (!isMpElement(option?.icon)) return;

    expect(option.icon.properties).toMatchObject({ countryCode: 'US', size: 'sm' });
  });

  it('provides the country flag for every supported language', () => {
    const element = selectElement(
      ForgeLanguageSwitcher({
        locale: 'en',
        locales: ['en', 'fr', 'es', 'nl', 'it', 'de', 'ko', 'ja', 'zh', 'ar', 'he'],
      }),
    );

    expect(element).toBeDefined();
    if (element === undefined) return;

    const expectedCountryCodes = ['AU', 'FR', 'ES', 'NL', 'IT', 'DE', 'KR', 'JP', 'CN', 'SA', 'IL'];
    const options = element.properties.options as Array<{ icon?: unknown }>;

    expect(options.map((option) => isMpElement(option.icon) && option.icon.properties.countryCode)).toEqual(
      expectedCountryCodes,
    );
  });

  it('forwards a selected value and disables the shared select when requested', () => {
    const onLocaleChange = vi.fn();
    const element = selectElement(
      ForgeLanguageSwitcher({
        disabled: true,
        locale: 'en',
        locales: ['en'],
        onLocaleChange,
      }),
    );

    expect(element).toBeDefined();
    if (element === undefined) return;

    expect(element.properties.disabled).toBe(true);
    element.properties.onUpdateModelValue?.('fr');
    expect(onLocaleChange).toHaveBeenCalledWith('fr');
  });
});
