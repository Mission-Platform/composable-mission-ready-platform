import { FieldSet, Input, PhoneInput, Textarea } from '@mission-platform/components/react';
import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `FieldSet` is the **React** build of the write-once `BaseFieldSet` in
 * `@mission-platform/components` — a native `<fieldset>` with an optional
 * `<legend>`/description that groups its default-slot content; `disabled` uses
 * the native `<fieldset disabled>` behaviour. Authored once in the neutral JSX
 * dialect and compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseFieldSet',
  component: FieldSet,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `FieldSet` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A native `<fieldset>` with an optional `<legend>`/description that groups its default-slot content; `disabled` uses the native `<fieldset disabled>` behaviour. Styling comes from the co-located `base-field-set.module.scss`.',
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
      <FieldSet {...arguments_}>
        <Input
          label="Full name"
          type="text"
          autocomplete="name"
          placeholder="Ada Lovelace"
          modelValue={name}
          onUpdateModelValue={setName}
        />
        <Input
          label="Email"
          type="email"
          autocomplete="email"
          placeholder="ada@example.com"
          modelValue={email}
          onUpdateModelValue={setEmail}
        />
        <PhoneInput
          label="Phone"
          modelValue={phone}
          country={country}
          onUpdateModelValue={setPhone}
          onUpdateCountry={setCountry}
        />
        <Textarea
          label="Message"
          rows={3}
          placeholder="How can we help?"
          modelValue={message}
          onUpdateModelValue={setMessage}
        />
      </FieldSet>
    );
  },
} satisfies Meta<typeof FieldSet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Flush: Story = { args: { flush: true } };

export const Disabled: Story = { args: { disabled: true } };

export const WithoutDescription: Story = { args: { description: undefined } };
