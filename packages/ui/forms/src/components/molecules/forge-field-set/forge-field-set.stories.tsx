import { useState } from '@mission-platform/forge-jsx';

import { ForgeFieldSet, ForgeInput, ForgePhoneInput, ForgeTextarea } from '@mission-platform/forms';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeFieldSet` is the write-once component of `@mission-platform/forms`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge-jsx`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/forms` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Forms/ForgeFieldSet',
  component: ForgeFieldSet,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeFieldSet` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A native `<fieldset>` with an optional `<legend>`/description that groups its default-slot content; `disabled` uses the native `<fieldset disabled>` behaviour. Styling comes from the co-located `forge-field-set.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    flush: { control: 'boolean' },
  },
  args: {
    legend: 'Contact details',
    description: 'How can we reach you?',
    disabled: false,
    flush: false,
  },
  render: (arguments_) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState('GB');
    const [message, setMessage] = useState('');
    return (
      <ForgeFieldSet {...arguments_}>
        <ForgeInput
          label="Full name"
          type="text"
          autocomplete="name"
          placeholder="Ada Lovelace"
          modelValue={name}
          onUpdateModelValue={setName}
        />
        <ForgeInput
          label="Email"
          type="email"
          autocomplete="email"
          placeholder="ada@example.com"
          modelValue={email}
          onUpdateModelValue={setEmail}
        />
        <ForgePhoneInput
          label="Phone"
          modelValue={phone}
          country={country}
          onUpdateModelValue={setPhone}
          onUpdateCountry={setCountry}
        />
        <ForgeTextarea
          label="Message"
          rows={3}
          placeholder="How can we help?"
          modelValue={message}
          onUpdateModelValue={setMessage}
        />
      </ForgeFieldSet>
    );
  },
} satisfies Meta<typeof ForgeFieldSet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Flush: Story = { args: { flush: true } };

export const Disabled: Story = { args: { disabled: true } };

export const WithoutDescription: Story = { args: { description: undefined } };
