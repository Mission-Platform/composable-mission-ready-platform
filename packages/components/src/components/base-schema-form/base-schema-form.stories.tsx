import { ref } from 'vue';

import BaseSchemaForm from './base-schema-form.vue';

import type { FormJsonSchema } from './types';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseSchemaForm',
  component: BaseSchemaForm,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`BaseSchemaForm` is driven entirely by a JSON Schema definition — both the rendered fields and the validation rules are generated from it and validated with [Ajv](https://ajv.js.org/). Pass a single object schema for a one-step form, or a top-level **array** of object schemas to render a multi-step **form wizard** (one step per entry, validated step by step). Generated validation messages are localised through the component\'s vue-i18n scope (per-property `errorMessage` overrides still win verbatim). See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    disabled: false,
  },
} satisfies Meta<typeof BaseSchemaForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Simple text-only form ────────────────────────────────────────────────────

const simpleSchema: FormJsonSchema = {
  type: 'object',
  properties: {
    firstName: {
      type: 'string',
      title: 'First name',
      ui: { placeholder: 'Alice' },
    },
    lastName: {
      type: 'string',
      title: 'Last name',
      ui: { placeholder: 'Smith' },
    },
    email: {
      type: 'string',
      format: 'email',
      title: 'Email',
      ui: { placeholder: 'alice@example.com' },
    },
  },
  required: ['firstName', 'lastName', 'email'],
};

function onSubmitDefault(values: Record<string, unknown>, isValid: boolean) {
  console.log('submit', { values, isValid });
}

export const Default: Story = {
  args: { schema: simpleSchema },
  render: (arguments_) => ({
    components: { BaseSchemaForm },
    setup() {
      const formValues = ref({});
      return { args: arguments_, formValues, onSubmit: onSubmitDefault };
    },
    template: `
      <BaseSchemaForm
        v-bind="args"
        v-model="formValues"
        style="max-width: 480px"
        @submit="onSubmit"
      />
    `,
  }),
};

// ─── All field types ──────────────────────────────────────────────────────────

const allTypesSchema: FormJsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name (text)', ui: { placeholder: 'Your name' } },
    email: { type: 'string', format: 'email', title: 'Email', ui: { placeholder: 'user@example.com' } },
    password: { type: 'string', format: 'password', title: 'Password', ui: { placeholder: '••••••••' } },
    age: { type: 'integer', title: 'Age' },
    website: { type: 'string', format: 'url', title: 'Website', ui: { placeholder: 'https://' } },
    bio: {
      type: 'string',
      title: 'Bio',
      ui: { widget: 'textarea', rows: 3, placeholder: 'Tell us about yourself…' },
    },
    notes: { type: 'string', title: 'Notes (markdown)', ui: { widget: 'markdown', rows: 4 } },
    plan: {
      type: 'string',
      title: 'Plan',
      ui: { placeholder: 'Choose a plan…' },
      oneOf: [
        { const: 'free', title: 'Free' },
        { const: 'pro', title: 'Pro' },
        { const: 'enterprise', title: 'Enterprise' },
      ],
    },
    role: {
      type: 'string',
      title: 'Role',
      ui: { widget: 'radio' },
      oneOf: [
        { const: 'admin', title: 'Admin' },
        { const: 'editor', title: 'Editor' },
        { const: 'viewer', title: 'Viewer' },
      ],
    },
    newsletter: { type: 'boolean', title: 'Subscribe to newsletter' },
    darkMode: { type: 'boolean', title: 'Dark mode', ui: { widget: 'switch' } },
  },
};

export const AllFieldTypes: Story = {
  args: { schema: allTypesSchema },
  render: (arguments_) => ({
    components: { BaseSchemaForm },
    setup() {
      const formValues = ref({});
      return { args: arguments_, formValues };
    },
    template: '<BaseSchemaForm v-bind="args" v-model="formValues" style="max-width: 540px" />',
  }),
};

// ─── With generated validation ────────────────────────────────────────────────

const validatedSchema: FormJsonSchema = {
  type: 'object',
  properties: {
    username: {
      type: 'string',
      title: 'Username',
      description: 'At least 3 characters',
      minLength: 3,
      errorMessage: { minLength: 'Username must be at least 3 characters' },
    },
    email: {
      type: 'string',
      format: 'email',
      title: 'Email',
      errorMessage: { format: 'Please enter a valid email address' },
    },
    age: {
      type: 'integer',
      title: 'Age',
      description: 'Must be 18 or older',
      minimum: 18,
      errorMessage: { minimum: 'Must be at least 18' },
    },
    agree: {
      type: 'boolean',
      title: 'I agree to the terms',
      errorMessage: { required: 'You must agree to proceed' },
    },
  },
  required: ['username', 'email', 'age', 'agree'],
};

export const WithValidation: Story = {
  args: { schema: validatedSchema },
  render: (arguments_) => ({
    components: { BaseSchemaForm },
    setup() {
      const formValues = ref({});
      const result = ref<string | undefined>(undefined);
      function onSubmit(values: Record<string, unknown>, isValid: boolean) {
        console.log('Form submitted:', values, 'Valid:', isValid);
        result.value = isValid ? '✅ Form submitted successfully!' : '❌ Please fix the errors above.';
      }
      return { args: arguments_, formValues, result, onSubmit };
    },
    template: `
      <div style="max-width: 480px">
        <BaseSchemaForm v-bind="args" v-model="formValues" @submit="onSubmit" />
        <p v-if="result" style="margin-top: 1rem; font-weight: 500">{{ result }}</p>
      </div>
    `,
  }),
};

// ─── Generated (i18n) validation messages ────────────────────────────────────

// No `errorMessage` overrides: every message below is produced from the schema
// and rendered through the component's i18n `errors.*` keys, so translating the
// app's locale automatically translates these messages too.
const i18nSchema: FormJsonSchema = {
  type: 'object',
  properties: {
    fullName: { type: 'string', title: 'Full name', minLength: 2 },
    email: { type: 'string', format: 'email', title: 'Email' },
    age: { type: 'integer', title: 'Age', minimum: 18 },
    accept: { type: 'boolean', title: 'Accept terms' },
  },
  required: ['fullName', 'email', 'age', 'accept'],
};

export const GeneratedMessages: Story = {
  args: { schema: i18nSchema },
  render: (arguments_) => ({
    components: { BaseSchemaForm },
    setup() {
      const formValues = ref({});
      return { args: arguments_, formValues, onSubmit: onSubmitDefault };
    },
    template: `
      <BaseSchemaForm
        v-bind="args"
        v-model="formValues"
        style="max-width: 480px"
        @submit="onSubmit"
      />
    `,
  }),
};

// ─── Multi-step wizard ────────────────────────────────────────────────────────

// A top-level *array* turns the same component into a multi-step form wizard:
// one step per entry, each step's `title`/`description` labelling the step in
// the indicator.  With the default `validationMode="per-step"`, forward
// navigation is gated on the current step validating; any step that holds
// errors is highlighted in the step indicator.
const wizardSchema: FormJsonSchema[] = [
  {
    type: 'object',
    title: 'Account',
    description: 'Sign-in details',
    properties: {
      username: { type: 'string', title: 'Username', minLength: 3, ui: { placeholder: 'alice' } },
      email: { type: 'string', format: 'email', title: 'Email', ui: { placeholder: 'alice@example.com' } },
    },
    required: ['username', 'email'],
  },
  {
    type: 'object',
    title: 'Profile',
    description: 'About you',
    properties: {
      fullName: { type: 'string', title: 'Full name' },
      bio: { type: 'string', title: 'Bio', ui: { widget: 'textarea', rows: 3 } },
    },
    required: ['fullName'],
  },
  {
    type: 'object',
    title: 'Preferences',
    description: 'Finishing touches',
    properties: {
      plan: {
        type: 'string',
        title: 'Plan',
        oneOf: [
          { const: 'free', title: 'Free' },
          { const: 'pro', title: 'Pro' },
        ],
      },
      newsletter: { type: 'boolean', title: 'Subscribe to newsletter' },
    },
    required: ['plan'],
  },
];

export const Wizard: Story = {
  args: { schema: wizardSchema },
  render: (arguments_) => ({
    components: { BaseSchemaForm },
    setup() {
      const formValues = ref({});
      const result = ref<string | undefined>(undefined);
      function onSubmit(values: Record<string, unknown>, isValid: boolean) {
        console.log('Wizard submitted:', values, 'Valid:', isValid);
        result.value = isValid ? '✅ Wizard completed!' : '❌ Some steps still have errors.';
      }
      return { args: arguments_, formValues, result, onSubmit };
    },
    template: `
      <div style="max-width: 640px">
        <BaseSchemaForm v-bind="args" v-model="formValues" @submit="onSubmit" />
        <p v-if="result" style="margin-top: 1rem; font-weight: 500">{{ result }}</p>
      </div>
    `,
  }),
};

// ─── Wizard validated at the end ──────────────────────────────────────────────

// `validationMode="final"` lets the user move freely between steps without any
// gate; validation runs only when the wizard is finished, after which every
// step that still has errors is highlighted in the step indicator.
export const WizardValidateAtEnd: Story = {
  args: { schema: wizardSchema, validationMode: 'final' },
  render: (arguments_) => ({
    components: { BaseSchemaForm },
    setup() {
      const formValues = ref({});
      const result = ref<string | undefined>(undefined);
      function onSubmit(values: Record<string, unknown>, isValid: boolean) {
        console.log('Wizard submitted:', values, 'Valid:', isValid);
        result.value = isValid
          ? '✅ Wizard completed!'
          : '❌ Some steps still have errors — see the highlighted steps above.';
      }
      return { args: arguments_, formValues, result, onSubmit };
    },
    template: `
      <div style="max-width: 640px">
        <BaseSchemaForm v-bind="args" v-model="formValues" @submit="onSubmit" />
        <p v-if="result" style="margin-top: 1rem; font-weight: 500">{{ result }}</p>
      </div>
    `,
  }),
};

// ─── Disabled form ────────────────────────────────────────────────────────────

export const Disabled: Story = {
  args: {
    schema: simpleSchema,
    modelValue: { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
    disabled: true,
  },
  render: (arguments_) => ({
    components: { BaseSchemaForm },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseSchemaForm v-bind="args" style="max-width: 480px" />',
  }),
};
