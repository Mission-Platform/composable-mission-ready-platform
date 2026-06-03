import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { z } from 'zod'
import BaseFormBuilder from './BaseFormBuilder.vue'
import type { FormSchema } from './types'

const meta = {
  title: 'Components/Forms/BaseFormBuilder',
  component: BaseFormBuilder,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    disabled: false,
  },
} satisfies Meta<typeof BaseFormBuilder>

export default meta
type Story = StoryObj<typeof meta>

// ─── Simple text-only form ────────────────────────────────────────────────────

const simpleSchema: FormSchema = {
  fields: [
    {
      key: 'firstName',
      label: 'First name',
      placeholder: 'Alice',
      required: true,
      schema: z.string().min(1, 'Required'),
    },
    {
      key: 'lastName',
      label: 'Last name',
      placeholder: 'Smith',
      required: true,
      schema: z.string().min(1, 'Required'),
    },
    {
      key: 'email',
      type: 'email',
      label: 'Email',
      placeholder: 'alice@example.com',
      required: true,
      schema: z.string().email('Enter a valid email'),
    },
  ],
  zodSchema: z.object({
    firstName: z.string().min(1, 'Required'),
    lastName: z.string().min(1, 'Required'),
    email: z.string().email('Enter a valid email'),
  }),
}

export const Default: Story = {
  args: { schema: simpleSchema },
  render: (args) => ({
    components: { BaseFormBuilder },
    setup() {
      const formValues = ref({})
      function onSubmit(values: Record<string, unknown>, isValid: boolean) {
        console.log('submit', { values, isValid })
      }
      return { args, formValues, onSubmit }
    },
    template: `
      <BaseFormBuilder
        v-bind="args"
        v-model="formValues"
        style="max-width: 480px"
        @submit="onSubmit"
      />
    `,
  }),
}

// ─── All field types ──────────────────────────────────────────────────────────

const allTypesSchema: FormSchema = {
  fields: [
    { key: 'name', label: 'Name (text)', placeholder: 'Your name' },
    { key: 'email', type: 'email', label: 'Email', placeholder: 'user@example.com' },
    { key: 'password', type: 'password', label: 'Password', placeholder: '••••••••' },
    { key: 'age', type: 'number', label: 'Age' },
    { key: 'website', type: 'url', label: 'Website', placeholder: 'https://' },
    { key: 'bio', type: 'textarea', label: 'Bio', rows: 3, placeholder: 'Tell us about yourself…' },
    { key: 'notes', type: 'markdown', label: 'Notes (markdown)', rows: 4 },
    {
      key: 'plan',
      type: 'select',
      label: 'Plan',
      placeholder: 'Choose a plan…',
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Pro', value: 'pro' },
        { label: 'Enterprise', value: 'enterprise' },
      ],
    },
    {
      key: 'role',
      type: 'radio',
      label: 'Role',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Viewer', value: 'viewer' },
      ],
    },
    { key: 'newsletter', type: 'checkbox', label: 'Subscribe to newsletter' },
    { key: 'darkMode', type: 'switch', label: 'Dark mode' },
  ],
}

export const AllFieldTypes: Story = {
  args: { schema: allTypesSchema },
  render: (args) => ({
    components: { BaseFormBuilder },
    setup() {
      const formValues = ref({})
      return { args, formValues }
    },
    template: '<BaseFormBuilder v-bind="args" v-model="formValues" style="max-width: 540px" />',
  }),
}

// ─── With Zod validation ──────────────────────────────────────────────────────

const validatedSchema: FormSchema = {
  fields: [
    {
      key: 'username',
      label: 'Username',
      hint: 'At least 3 characters',
      schema: z.string().min(3, 'Username must be at least 3 characters'),
    },
    {
      key: 'email',
      type: 'email',
      label: 'Email',
      schema: z.string().email('Please enter a valid email address'),
    },
    {
      key: 'age',
      type: 'number',
      label: 'Age',
      hint: 'Must be 18 or older',
      schema: z.number().min(18, 'Must be at least 18'),
    },
    {
      key: 'agree',
      type: 'checkbox',
      label: 'I agree to the terms',
      schema: z.boolean().refine((v) => v, 'You must agree to proceed'),
    },
  ],
}

export const WithValidation: Story = {
  args: { schema: validatedSchema },
  render: (args) => ({
    components: { BaseFormBuilder },
    setup() {
      const formValues = ref({})
      const result = ref<string | null>(null)
      function onSubmit(values: Record<string, unknown>, isValid: boolean) {
        result.value = isValid
          ? '✅ Form submitted successfully!'
          : '❌ Please fix the errors above.'
      }
      return { args, formValues, result, onSubmit }
    },
    template: `
      <div style="max-width: 480px">
        <BaseFormBuilder v-bind="args" v-model="formValues" @submit="onSubmit" />
        <p v-if="result" style="margin-top: 1rem; font-weight: 500">{{ result }}</p>
      </div>
    `,
  }),
}

// ─── Disabled form ────────────────────────────────────────────────────────────

export const Disabled: Story = {
  args: {
    schema: simpleSchema,
    modelValue: { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
    disabled: true,
  },
  render: (args) => ({
    components: { BaseFormBuilder },
    setup() {
      return { args }
    },
    template: '<BaseFormBuilder v-bind="args" style="max-width: 480px" />',
  }),
}
