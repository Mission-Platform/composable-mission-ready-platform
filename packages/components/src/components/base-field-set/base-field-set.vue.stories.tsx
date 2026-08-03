import { ref } from 'vue';

import { FieldSet, Input, PhoneInput, Textarea } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `FieldSet` is the Vue 3 build of the write-once `BaseFieldSet` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseFieldSet',
  component: FieldSet,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `FieldSet` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A native `<fieldset>` with an optional `<legend>`/description that groups its default-slot content; `disabled` uses the native `<fieldset disabled>` behaviour. Styling comes from the co-located `base-field-set.module.scss`.',
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
  render: (arguments_) => ({
    components: { FieldSet, Input, PhoneInput, Textarea },
    setup() {
      const name = ref('');
      const email = ref('');
      const phone = ref('');
      const country = ref('GB');
      const message = ref('');
      return { args: arguments_, name, email, phone, country, message };
    },
    template: `
      <FieldSet v-bind="args">
        <Input
          label="Full name"
          type="text"
          autocomplete="name"
          placeholder="Ada Lovelace"
          :model-value="name"
          @update-model-value="name = $event"
        />
        <Input
          label="Email"
          type="email"
          autocomplete="email"
          placeholder="ada@example.com"
          :model-value="email"
          @update-model-value="email = $event"
        />
        <PhoneInput
          label="Phone"
          :model-value="phone"
          :country="country"
          @update-model-value="phone = $event"
          @update-country="country = $event"
        />
        <Textarea
          label="Message"
          :rows="3"
          placeholder="How can we help?"
          :model-value="message"
          @update-model-value="message = $event"
        />
      </FieldSet>
    `,
  }),
} satisfies Meta<typeof FieldSet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Flush: Story = { args: { flush: true } };

export const Disabled: Story = { args: { disabled: true } };

export const WithoutDescription: Story = { args: { description: undefined } };
