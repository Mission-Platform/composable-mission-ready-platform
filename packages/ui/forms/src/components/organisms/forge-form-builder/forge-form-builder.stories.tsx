import { useArgs } from 'storybook/preview-api';

import { ForgeFormBuilder } from '@mission-platform/forms';

import type { SchemaFormDefinition } from './forge-form-builder';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeFormBuilder` is the write-once `ForgeFormBuilder` in `@mission-platform/forms`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge-jsx`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework.
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/forms` import auto-resolves to the framework selected by
 * the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by that
 * framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Organisms/Forms/ForgeFormBuilder',
  component: ForgeFormBuilder,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeFormBuilder` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It is a visual authoring surface for JSON-Schema forms: a field **palette**, a tabbed centre (**Editor** canvas, a wizard-only **Steps** tab, a live **Preview**, and a **Schema** JSON tab), and an **inspector**. The whole field tree is emitted as a `SchemaFormDefinition` (built through the shared `@mission-platform/forms-core`) via `modelValue` + `onUpdateModelValue`, ready to feed straight into `SchemaForm`. Styling comes from the co-located `forge-form-builder.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    wizard: { control: 'boolean' },
  },
  args: {
    disabled: false,
    wizard: false,
  },
  render: (arguments_) => {
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <ForgeFormBuilder
        {...arguments_}
        modelValue={modelValue}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeFormBuilder>;

export default meta;
type Story = StoryObj<typeof meta>;

const contactSchema: SchemaFormDefinition = {
  type: 'object',
  title: 'Contact form',
  properties: {
    name: { type: 'string', title: 'Full name' },
    email: { type: 'string', format: 'email', title: 'Email' },
    message: { type: 'string', title: 'Message', ui: { widget: 'textarea', rows: 4 } },
  },
  required: ['name', 'email'],
};

const profileSchema: SchemaFormDefinition = {
  type: 'object',
  title: 'Profile',
  properties: {
    fullName: { type: 'string', title: 'Full name' },
    address: {
      type: 'object',
      title: 'Address',
      properties: {
        street: { type: 'string', title: 'Street' },
        city: { type: 'string', title: 'City' },
      },
    },
  },
};

const wizardSchema: SchemaFormDefinition = [
  {
    type: 'object',
    title: 'Profile',
    properties: { name: { type: 'string', title: 'Name' }, email: { type: 'string', format: 'email', title: 'Email' } },
  },
  {
    type: 'object',
    title: 'Preferences',
    properties: { theme: { type: 'string', title: 'Theme', enum: ['light', 'dark'] } },
  },
];

const allTypesSchema: SchemaFormDefinition = {
  type: 'object',
  title: 'Every field type',
  properties: {
    text: { type: 'string', title: 'Text' },
    paragraph: { type: 'string', title: 'Paragraph', ui: { widget: 'textarea', rows: 4 } },
    notes: { type: 'string', title: 'Notes', ui: { widget: 'markdown' } },
    email: { type: 'string', format: 'email', title: 'Email' },
    password: { type: 'string', format: 'password', title: 'Password' },
    website: { type: 'string', format: 'url', title: 'Website' },
    phone: { type: 'string', format: 'tel', title: 'Phone', ui: { widget: 'tel' } },
    number: { type: 'number', title: 'Number' },
    quantity: { type: 'number', title: 'Quantity', ui: { widget: 'stepper', step: 1 } },
    select: { type: 'string', title: 'Select', enum: ['a', 'b'] },
    tags: { type: 'array', title: 'Tags', ui: { widget: 'multiselect' } },
    plan: { type: 'string', title: 'Plan', enum: ['free', 'pro'], ui: { widget: 'radio' } },
    checkbox: { type: 'boolean', title: 'Checkbox' },
    notify: { type: 'boolean', title: 'Notify', ui: { widget: 'switch' } },
    date: { type: 'string', format: 'date', title: 'Date' },
    time: { type: 'string', format: 'time', title: 'Time' },
    when: { type: 'string', format: 'date-time', title: 'When' },
    stay: { type: 'string', title: 'Stay', ui: { widget: 'daterange' } },
    slot: { type: 'string', title: 'Slot', ui: { widget: 'timerange' } },
    window: { type: 'string', title: 'Window', ui: { widget: 'datetimerange' } },
    attachment: { type: 'string', title: 'Attachment', ui: { widget: 'file', accept: 'image/*', multiple: true } },
    place: { type: 'string', title: 'Place', ui: { widget: 'location', locationFormat: 'dd' } },
  },
};

const conditionalSchema: SchemaFormDefinition = {
  type: 'object',
  title: 'Conditional fields',
  properties: {
    hasReferral: { type: 'boolean', title: 'Has referral', ui: { widget: 'switch' } },
    referralCode: {
      type: 'string',
      title: 'Referral code',
      ui: { visibleWhen: { allOf: [{ field: 'hasReferral', equals: true }] } },
    },
  },
};

export const Default: Story = {};

export const Prefilled: Story = { args: { modelValue: contactSchema, title: 'Contact form' } };

export const NestedFieldSet: Story = { args: { modelValue: profileSchema, title: 'Profile' } };

export const Wizard: Story = { args: { modelValue: wizardSchema, wizard: true } };

export const AllFieldTypes: Story = {
  args: { modelValue: allTypesSchema, title: 'Every field type' },
  parameters: {
    docs: {
      description: {
        story:
          'The palette (`DEFAULT_FIELD_TYPES`) offers **every** form input the schema-driven form can render — text, text area, Markdown, email, password, URL, phone, number, number stepper, select, multi-select, radio, checkbox, switch, date, time, date-&-time, date/time/date-time ranges, file upload, location — plus the grouping **field set**. Select a field to see the input-specific options in the inspector (rows, length/pattern, step amount, accepted file types, coordinate format, date bounds, show-seconds, …).',
      },
    },
  },
};

export const Conditions: Story = {
  args: { modelValue: conditionalSchema, title: 'Conditional fields' },
  parameters: {
    docs: {
      description: {
        story:
          "Select the **Referral code** field and use the inspector's *Conditional visibility* editor: it is shown only when *Has referral* is on, authored as a `ui.visibleWhen` rule and previewed live in the Preview tab.",
      },
    },
  },
};

export const Disabled: Story = { args: { modelValue: contactSchema, disabled: true } };
