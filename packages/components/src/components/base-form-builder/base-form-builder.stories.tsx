import { ref } from 'vue';

import BaseFormBuilder from './base-form-builder.vue';

import type { SchemaFormDefinition } from './types';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseFormBuilder',
  component: BaseFormBuilder,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '`BaseFormBuilder` is a visual, drag-and-drop authoring surface for JSON-Schema forms — the counterpart to `BaseSchemaForm`. It uses a three-column [`BaseVerticalLayout`](?path=/docs/components-layout-baseverticallayout--docs): the **start** sidebar is the field palette, the **centre** is a tabbed [`BaseTabs`](?path=/docs/components-navigation-basetabs--docs) view of the **Editor** canvas, a live **Preview**, and a **Schema** tab (plus a wizard-only **Steps** tab, next to **Editor**, for adding / removing steps and editing each step’s title, description, and visibility), and the **end** sidebar is the inspector — the selected field’s properties, or the form settings when nothing is selected. Drag-and-drop is powered by [`@dnd-kit/vue`](https://dndkit.com/vue): drag a field type from the palette onto the canvas (or click it), reorder rows by their handle, drop a field into a **field set** to nest it to any depth, and — in `wizard` mode — drop a field into a step section to assign it. The component emits a [JSON Schema](https://json-schema.org/) definition via `v-model` that can be fed straight back into `BaseSchemaForm`. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    wizard: { control: 'boolean' },
    disabled: { control: 'boolean' },
    startDraggable: { control: 'select', options: [false, true, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    endDraggable: { control: 'select', options: [false, true, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    title: 'Untitled form',
    description: 'Drag fields from the left to build the form.',
    wizard: false,
    disabled: false,
    startDraggable: false,
    endDraggable: false,
  },
} satisfies Meta<typeof BaseFormBuilder>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Empty builder ──────────────────────────────────────────────────────────

export const Default: Story = {
  render: (arguments_) => ({
    components: { BaseFormBuilder },
    setup() {
      const schema = ref<SchemaFormDefinition | undefined>();
      return { args: arguments_, schema };
    },
    template: `
      <BaseFormBuilder
        v-bind="args"
        v-model="schema"
        style="padding: 1rem"
      />
    `,
  }),
};

// ─── Pre-filled builder ───────────────────────────────────────────────────────

const contactSchema: SchemaFormDefinition = {
  type: 'object',
  title: 'Contact form',
  properties: {
    full_name: {
      type: 'string',
      title: 'Full name',
      ui: { widget: 'text', placeholder: 'Jane Doe' },
      minLength: 2,
    },
    email: {
      type: 'string',
      title: 'Email',
      format: 'email',
      ui: { widget: 'email', placeholder: 'jane@example.com' },
    },
    topic: {
      type: 'string',
      title: 'Topic',
      ui: { widget: 'select' },
      oneOf: [
        { const: 'sales', title: 'Sales' },
        { const: 'support', title: 'Support' },
        { const: 'other', title: 'Other' },
      ],
    },
    message: {
      type: 'string',
      title: 'Message',
      ui: { widget: 'textarea', rows: 4, placeholder: 'How can we help?' },
    },
  },
  required: ['full_name', 'email'],
};

export const Prefilled: Story = {
  args: {
    title: 'Contact form',
    description: 'A starter schema loaded into the builder.',
  },
  render: (arguments_) => ({
    components: { BaseFormBuilder },
    setup() {
      const schema = ref<SchemaFormDefinition | undefined>(structuredClone(contactSchema));
      return { args: arguments_, schema };
    },
    template: `
      <BaseFormBuilder
        v-bind="args"
        v-model="schema"
        style="padding: 1rem"
      />
    `,
  }),
};

// ─── Nested field set ─────────────────────────────────────────────────────────

const nestedSchema: SchemaFormDefinition = {
  type: 'object',
  title: 'Profile',
  properties: {
    display_name: { type: 'string', title: 'Display name', ui: { widget: 'text' } },
    address: {
      type: 'object',
      title: 'Address',
      ui: { widget: 'fieldset' },
      properties: {
        street: { type: 'string', title: 'Street', ui: { widget: 'text' } },
        city: { type: 'string', title: 'City', ui: { widget: 'text' } },
      },
      required: ['street'],
    },
  },
};

export const NestedFieldSet: Story = {
  args: {
    title: 'Profile',
    description: 'A field set groups related fields into a nested object.',
  },
  render: (arguments_) => ({
    components: { BaseFormBuilder },
    setup() {
      const schema = ref<SchemaFormDefinition | undefined>(structuredClone(nestedSchema));
      return { args: arguments_, schema };
    },
    template: `
      <BaseFormBuilder
        v-bind="args"
        v-model="schema"
        style="padding: 1rem"
      />
    `,
  }),
};

// ─── Wizard ─────────────────────────────────────────────────────────────────

const wizardSchema: SchemaFormDefinition = [
  {
    type: 'object',
    title: 'Account',
    properties: {
      email: { type: 'string', title: 'Email', format: 'email', ui: { widget: 'email' } },
      password: { type: 'string', title: 'Password', ui: { widget: 'password' } },
    },
    required: ['email', 'password'],
  },
  {
    type: 'object',
    title: 'Profile',
    properties: {
      full_name: { type: 'string', title: 'Full name', ui: { widget: 'text' } },
    },
  },
];

export const Wizard: Story = {
  args: {
    wizard: true,
    title: 'Sign-up wizard',
    description: 'Drop fields into a step section to assign them.',
  },
  render: (arguments_) => ({
    components: { BaseFormBuilder },
    setup() {
      const schema = ref<SchemaFormDefinition | undefined>(structuredClone(wizardSchema));
      return { args: arguments_, schema };
    },
    template: `
      <BaseFormBuilder
        v-bind="args"
        v-model="schema"
        style="padding: 1rem"
      />
    `,
  }),
};

// ─── Every field type ─────────────────────────────────────────────────────────

/**
 * One property for every widget the palette can author — a single schema that
 * exercises each {@link FormFieldType} in `BaseFormBuilder`. Select any row to
 * inspect (and tweak) the type-specific options in the inspector.
 */
const allFieldsSchema: SchemaFormDefinition = {
  type: 'object',
  title: 'Every field type',
  description: 'One of every field the palette can create — select a row to inspect its options.',
  properties: {
    text_field: {
      type: 'string',
      title: 'Text',
      minLength: 2,
      maxLength: 80,
      ui: { widget: 'text', placeholder: 'Single-line text', autocapitalize: 'sentences' },
    },
    textarea_field: {
      type: 'string',
      title: 'Text area',
      ui: { widget: 'textarea', rows: 4, placeholder: 'Multi-line text' },
    },
    markdown_field: {
      type: 'string',
      title: 'Markdown',
      ui: { widget: 'markdown', rows: 6, placeholder: '# A heading\n\nSome **bold** copy.' },
    },
    email_field: {
      type: 'string',
      title: 'Email',
      format: 'email',
      ui: { widget: 'email', placeholder: 'jane@example.com', multiple: true, autocomplete: 'email' },
    },
    password_field: {
      type: 'string',
      title: 'Password',
      format: 'password',
      minLength: 8,
      ui: { widget: 'password', autocomplete: 'new-password' },
    },
    url_field: {
      type: 'string',
      title: 'Website',
      format: 'url',
      ui: { widget: 'url', placeholder: 'https://example.com', autocomplete: 'url' },
    },
    tel_field: {
      type: 'string',
      title: 'Phone',
      format: 'tel',
      ui: { widget: 'tel', placeholder: '+44 20 7946 0000', autocomplete: 'tel' },
    },
    number_field: {
      type: 'number',
      title: 'Number',
      minimum: 0,
      maximum: 100,
      ui: { widget: 'number', unsigned: true },
    },
    stepper_field: {
      type: 'number',
      title: 'Stepper',
      ui: { widget: 'stepper', step: 0.5, precision: 2 },
    },
    select_field: {
      type: 'string',
      title: 'Select',
      ui: { widget: 'select' },
      oneOf: [
        { const: 'small', title: 'Small' },
        { const: 'medium', title: 'Medium' },
        { const: 'large', title: 'Large' },
      ],
    },
    multiselect_field: {
      type: 'array',
      title: 'Multi-select',
      ui: { widget: 'multiselect' },
      oneOf: [
        { const: 'sports', title: 'Sports' },
        { const: 'music', title: 'Music' },
        { const: 'travel', title: 'Travel' },
      ],
    },
    radio_field: {
      type: 'string',
      title: 'Radio group',
      ui: { widget: 'radio' },
      oneOf: [
        { const: 'yes', title: 'Yes' },
        { const: 'no', title: 'No' },
        { const: 'maybe', title: 'Maybe' },
      ],
    },
    checkbox_field: { type: 'boolean', title: 'Checkbox', ui: { widget: 'checkbox' } },
    switch_field: { type: 'boolean', title: 'Switch', ui: { widget: 'switch' } },
    date_field: {
      type: 'string',
      title: 'Date',
      format: 'date',
      ui: { widget: 'date', minDate: '2020-01-01', maxDate: '2030-12-31' },
    },
    time_field: { type: 'string', title: 'Time', format: 'time', ui: { widget: 'time', showSeconds: true } },
    datetime_field: { type: 'string', title: 'Date & time', format: 'date-time', ui: { widget: 'datetime' } },
    daterange_field: { type: 'string', title: 'Date range', ui: { widget: 'daterange' } },
    timerange_field: { type: 'string', title: 'Time range', ui: { widget: 'timerange', showSeconds: true } },
    datetimerange_field: { type: 'string', title: 'Date & time range', ui: { widget: 'datetimerange' } },
    location_field: { type: 'string', title: 'Location', ui: { widget: 'location', locationFormat: 'latlng' } },
    file_field: {
      type: 'string',
      title: 'File upload',
      ui: { widget: 'file', accept: 'image/*', multiple: true, capture: 'environment' },
    },
    details: {
      type: 'object',
      title: 'Field set',
      ui: { widget: 'fieldset', hint: 'A group of nested fields.' },
      properties: {
        note: { type: 'string', title: 'Note', ui: { widget: 'text', placeholder: 'A nested field' } },
        priority: {
          type: 'number',
          title: 'Priority',
          ui: { widget: 'stepper', step: 1, integer: true, unsigned: true },
        },
      },
      required: ['note'],
    },
  },
  required: ['text_field', 'email_field'],
};

export const AllFieldTypes: Story = {
  args: {
    title: 'Every field type',
    description: 'A schema with one of every field the palette can create.',
  },
  render: (arguments_) => ({
    components: { BaseFormBuilder },
    setup() {
      const schema = ref<SchemaFormDefinition | undefined>(structuredClone(allFieldsSchema));
      return { args: arguments_, schema };
    },
    template: `
      <BaseFormBuilder
        v-bind="args"
        v-model="schema"
        style="padding: 1rem"
      />
    `,
  }),
};

// ─── Every condition ──────────────────────────────────────────────────────────

/**
 * Conditional visibility (`ui.visibleWhen`) exercised end-to-end: a handful of
 * controlling fields at the top, then one dependent field per condition
 * **operator** (`equals`, `notEquals`, `in`, `contains`, `gt`, `gte`, `lt`,
 * `lte`, `truthy`) and one per **combinator** (`allOf` / `anyOf` / `oneOf`).
 * Switch to the **Preview** tab and change the controllers to watch each
 * dependent field reveal itself.
 */
const conditionsSchema: SchemaFormDefinition = {
  type: 'object',
  title: 'Conditional fields',
  description: 'Each dependent field below is revealed by a different condition operator or combinator.',
  properties: {
    // ── Controlling fields ──
    plan: {
      type: 'string',
      title: 'Plan',
      ui: { widget: 'select', hint: 'Drives the equals / notEquals / in / combinator rules.' },
      oneOf: [
        { const: 'free', title: 'Free' },
        { const: 'pro', title: 'Pro' },
        { const: 'team', title: 'Team' },
      ],
    },
    age: {
      type: 'number',
      title: 'Age',
      ui: { widget: 'number', hint: 'Drives the gt / gte / lt / lte rules.' },
    },
    contact_method: {
      type: 'string',
      title: 'Preferred contact',
      ui: { widget: 'radio', hint: 'Drives the oneOf (XOR) rule.' },
      oneOf: [
        { const: 'email', title: 'Email' },
        { const: 'sms', title: 'SMS' },
        { const: 'none', title: 'Do not contact' },
      ],
    },
    interests: {
      type: 'array',
      title: 'Interests',
      ui: { widget: 'multiselect', hint: 'Drives the contains rule.' },
      oneOf: [
        { const: 'sports', title: 'Sports' },
        { const: 'music', title: 'Music' },
        { const: 'travel', title: 'Travel' },
      ],
    },
    newsletter: {
      type: 'boolean',
      title: 'Subscribe to the newsletter',
      ui: { widget: 'switch', hint: 'Drives the truthy rules.' },
    },

    // ── One dependent field per operator ──
    pro_seats: {
      type: 'number',
      title: 'Pro seats — equals',
      ui: { widget: 'number', visibleWhen: { allOf: [{ field: 'plan', equals: 'pro' }] } },
    },
    cancel_reason: {
      type: 'string',
      title: 'Why are you leaving free? — notEquals',
      ui: { widget: 'textarea', rows: 2, visibleWhen: { allOf: [{ field: 'plan', notEquals: 'free' }] } },
    },
    billing_contact: {
      type: 'string',
      title: 'Billing contact — in',
      ui: { widget: 'email', visibleWhen: { allOf: [{ field: 'plan', in: ['pro', 'team'] }] } },
    },
    sports_gear: {
      type: 'string',
      title: 'Favourite sport — contains',
      ui: { widget: 'text', visibleWhen: { allOf: [{ field: 'interests', contains: 'sports' }] } },
    },
    senior_discount: {
      type: 'boolean',
      title: 'Claim senior discount — gt',
      ui: { widget: 'checkbox', visibleWhen: { allOf: [{ field: 'age', gt: 65 }] } },
    },
    voucher_code: {
      type: 'string',
      title: 'Adult voucher code — gte',
      ui: { widget: 'text', visibleWhen: { allOf: [{ field: 'age', gte: 18 }] } },
    },
    guardian_consent: {
      type: 'boolean',
      title: 'Guardian consent — lt',
      ui: { widget: 'checkbox', visibleWhen: { allOf: [{ field: 'age', lt: 18 }] } },
    },
    junior_pack: {
      type: 'boolean',
      title: "Add the kids' pack — lte",
      ui: { widget: 'switch', visibleWhen: { allOf: [{ field: 'age', lte: 12 }] } },
    },
    subscriber_email: {
      type: 'string',
      title: 'Newsletter email — truthy (true)',
      format: 'email',
      ui: { widget: 'email', visibleWhen: { allOf: [{ field: 'newsletter', truthy: true }] } },
    },
    no_thanks_reason: {
      type: 'string',
      title: 'Tell us why not — truthy (false)',
      ui: { widget: 'textarea', rows: 2, visibleWhen: { allOf: [{ field: 'newsletter', truthy: false }] } },
    },

    // ── One dependent field per combinator ──
    team_billing: {
      type: 'string',
      title: 'Team billing email — allOf (AND)',
      format: 'email',
      ui: {
        widget: 'email',
        hint: 'Shown when plan is "team" AND age ≥ 18.',
        visibleWhen: {
          allOf: [
            { field: 'plan', equals: 'team' },
            { field: 'age', gte: 18 },
          ],
        },
      },
    },
    priority_support: {
      type: 'boolean',
      title: 'Enable priority support — anyOf (OR)',
      ui: {
        widget: 'switch',
        hint: 'Shown when plan is "pro" OR "team".',
        visibleWhen: {
          anyOf: [
            { field: 'plan', equals: 'pro' },
            { field: 'plan', equals: 'team' },
          ],
        },
      },
    },
    reminder: {
      type: 'string',
      title: 'Reminder details — oneOf (XOR)',
      ui: {
        widget: 'text',
        hint: 'Shown when exactly one of email / SMS is chosen.',
        visibleWhen: {
          oneOf: [
            { field: 'contact_method', equals: 'email' },
            { field: 'contact_method', equals: 'sms' },
          ],
        },
      },
    },
  },
};

export const Conditions: Story = {
  args: {
    title: 'Conditional fields',
    description: 'One dependent field per condition operator and combinator.',
  },
  render: (arguments_) => ({
    components: { BaseFormBuilder },
    setup() {
      const schema = ref<SchemaFormDefinition | undefined>(structuredClone(conditionsSchema));
      return { args: arguments_, schema };
    },
    template: `
      <BaseFormBuilder
        v-bind="args"
        v-model="schema"
        style="padding: 1rem"
      />
    `,
  }),
};

// ─── Read-only ────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  args: {
    disabled: true,
    title: 'Read-only',
    description: 'The builder is disabled — no edits or drag-and-drop.',
  },
  render: (arguments_) => ({
    components: { BaseFormBuilder },
    setup() {
      const schema = ref<SchemaFormDefinition | undefined>(structuredClone(contactSchema));
      return { args: arguments_, schema };
    },
    template: `
      <BaseFormBuilder
        v-bind="args"
        v-model="schema"
        style="padding: 1rem"
      />
    `,
  }),
};
