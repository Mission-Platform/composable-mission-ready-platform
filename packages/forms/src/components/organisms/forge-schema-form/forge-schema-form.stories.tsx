import { useArgs } from 'storybook/preview-api';

import { ForgeSchemaForm } from '@mission-platform/forms';

import type { SchemaFormDefinition } from './forge-schema-form';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeSchemaForm` is the write-once `ForgeSchemaForm` in `@mission-platform/forms`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework.
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/forms` import auto-resolves to the framework selected by
 * the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by that
 * framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Organisms/Forms/ForgeSchemaForm',
  component: ForgeSchemaForm,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeSchemaForm` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It is driven entirely by a **JSON Schema**: both the rendered fields and the validation rules are derived from it through the shared `@mission-platform/forms-core` package (so every framework validates identically). A single object renders a one-step form; a top-level array renders a multi-step wizard. Fields support nested field sets, `ui.visibleWhen` conditional visibility, and Ajv validation surfaced as per-field errors. Generated messages use the built-in English fallback (the neutral dialect has no i18n). Styling comes from the co-located `forge-schema-form.module.scss`.',
      },
    },
  },
  args: {
    modelValue: {},
  },
  render: (arguments_) => {
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <ForgeSchemaForm
        {...arguments_}
        modelValue={modelValue}
        onSubmit={(values, valid) => console.log('submit', values, valid)}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeSchemaForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Schemas ────────────────────────────────────────────────────────────────

const simpleSchema: SchemaFormDefinition = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Full name', ui: { placeholder: 'Ada Lovelace' } },
    email: { type: 'string', format: 'email', title: 'Email', ui: { placeholder: 'you@example.com' } },
    role: {
      type: 'string',
      title: 'Role',
      oneOf: [
        { const: 'eng', title: 'Engineer' },
        { const: 'design', title: 'Designer' },
      ],
    },
    bio: { type: 'string', title: 'Bio', ui: { widget: 'textarea', rows: 4 } },
    subscribe: { type: 'boolean', title: 'Subscribe to updates', ui: { widget: 'switch' } },
  },
  required: ['name', 'email'],
};

const allTypesSchema: SchemaFormDefinition = {
  type: 'object',
  properties: {
    text: { type: 'string', title: 'Text' },
    phone: { type: 'string', format: 'tel', title: 'Phone' },
    number: { type: 'number', title: 'Number', ui: { widget: 'stepper' } },
    checkbox: { type: 'boolean', title: 'Checkbox' },
    select: { type: 'string', title: 'Select', enum: ['one', 'two', 'three'] },
    multiselect: { type: 'array', title: 'Multi-select', enum: ['a', 'b', 'c'] },
    date: { type: 'string', format: 'date', title: 'Date' },
    datetime: { type: 'string', format: 'date-time', title: 'Date & time' },
    location: { type: 'object', title: 'Location', ui: { widget: 'location' } },
  },
};

const validatedSchema: SchemaFormDefinition = {
  type: 'object',
  properties: {
    username: { type: 'string', title: 'Username', minLength: 3, maxLength: 20 },
    age: { type: 'integer', title: 'Age', minimum: 18, maximum: 120, ui: { widget: 'stepper', integer: true } },
    website: { type: 'string', format: 'url', title: 'Website' },
    terms: { type: 'boolean', title: 'Accept terms', ui: { widget: 'checkbox' } },
  },
  required: ['username', 'terms'],
};

const fieldSetSchema: SchemaFormDefinition = {
  type: 'object',
  properties: {
    fullName: { type: 'string', title: 'Full name' },
    address: {
      type: 'object',
      title: 'Address',
      description: 'Where should we ship your order?',
      properties: {
        street: { type: 'string', title: 'Street' },
        city: { type: 'string', title: 'City' },
        postcode: { type: 'string', title: 'Postcode' },
      },
      required: ['street', 'city'],
    },
  },
  required: ['fullName'],
};

const wizardSchema: SchemaFormDefinition = [
  {
    type: 'object',
    title: 'Profile',
    description: 'Tell us about yourself',
    properties: {
      name: { type: 'string', title: 'Name' },
      email: { type: 'string', format: 'email', title: 'Email' },
    },
    required: ['name', 'email'],
  },
  {
    type: 'object',
    title: 'Preferences',
    properties: {
      theme: { type: 'string', title: 'Theme', enum: ['light', 'dark', 'system'] },
      newsletter: { type: 'boolean', title: 'Newsletter', ui: { widget: 'switch' } },
    },
  },
];

const conditionalWizardSchema: SchemaFormDefinition = [
  {
    type: 'object',
    title: 'Account type',
    properties: {
      isBusiness: { type: 'boolean', title: 'Business account', ui: { widget: 'switch' } },
    },
  },
  {
    type: 'object',
    title: 'Company',
    visibleWhen: { field: 'isBusiness', equals: true },
    properties: {
      company: { type: 'string', title: 'Company name' },
      vat: { type: 'string', title: 'VAT number' },
    },
    required: ['company'],
  },
  {
    type: 'object',
    title: 'Confirm',
    properties: {
      agree: { type: 'boolean', title: 'I agree to the terms', ui: { widget: 'checkbox' } },
    },
    required: ['agree'],
  },
];

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Default: Story = { args: { schema: simpleSchema } };

export const AllFieldTypes: Story = { args: { schema: allTypesSchema } };

export const WithValidation: Story = { args: { schema: validatedSchema } };

export const GeneratedMessages: Story = {
  args: { schema: validatedSchema },
  parameters: {
    docs: {
      description: {
        story:
          'Validation messages are generated from the JSON Schema. Submit the empty form to see the built-in English fallbacks (the neutral dialect has no i18n).',
      },
    },
  },
};

export const WithFieldSets: Story = { args: { schema: fieldSetSchema } };

export const Wizard: Story = { args: { schema: wizardSchema } };

export const WizardValidateAtEnd: Story = {
  args: { schema: wizardSchema, validationMode: 'final' },
  parameters: {
    docs: {
      description: {
        story:
          "With `validationMode: 'final'` the user moves freely between steps; validation runs only when the wizard is finished, after which any step that still has errors is highlighted in the step indicator.",
      },
    },
  },
};

export const WizardConditionalSteps: Story = {
  args: { schema: conditionalWizardSchema },
  parameters: {
    docs: {
      description: {
        story:
          'A wizard step can carry its own `visibleWhen` condition: the **Company** step appears only once *Business account* is switched on, and is skipped (and excluded from validation) otherwise.',
      },
    },
  },
};

export const Disabled: Story = { args: { schema: simpleSchema, disabled: true } };
