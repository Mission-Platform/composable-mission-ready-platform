import { expect, fn, userEvent, within } from 'storybook/test';

import { ForgeLanguageSwitcher } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const onLocaleChange = fn();

const meta = {
  title: 'Molecules/Navigation/ForgeLanguageSwitcher',
  component: ForgeLanguageSwitcher,
  tags: ['autodocs'],
  args: {
    id: 'language-switcher',
    label: 'Language',
    labelHidden: false,
    locale: 'en',
    onLocaleChange,
    locales: [
      { code: 'en', label: 'English' },
      { code: 'fr', label: 'Français' },
      { code: 'de', label: 'Deutsch' },
    ],
  },
} satisfies Meta<typeof ForgeLanguageSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SelectsAnotherLocale: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('combobox', { name: 'Language' });
    await userEvent.selectOptions(trigger, 'fr');
    await expect(onLocaleChange).toHaveBeenCalledWith('fr');
  },
};
