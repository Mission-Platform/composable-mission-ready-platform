import { expect, fn, userEvent, within } from 'storybook/test';

import { ForgeLanguageSwitcher } from './forge-language-switcher';

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
    await userEvent.click(canvas.getByRole('combobox', { name: 'Language' }));
    await userEvent.click(canvas.getByRole('option', { name: 'Français' }));
    await expect(onLocaleChange).toHaveBeenCalledWith('fr');
  },
};
