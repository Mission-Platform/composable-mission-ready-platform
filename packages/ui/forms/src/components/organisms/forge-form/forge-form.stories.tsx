import { ForgeButton } from '@mission-platform/components';

import { ForgeForm, ForgeInput, useFormContext } from '@mission-platform/forms';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Forms/ForgeForm',
  component: ForgeForm,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Context-driven `ForgeForm` component supporting schema validation (Standard Schema, Zod, Valibot, Yup), dirty/touched tracking, and an accessible `role="alert"` error summary banner.',
      },
    },
  },
} satisfies Meta<typeof ForgeForm>;

export default meta;
type Story = StoryObj<typeof meta>;

function FormFields() {
  const context = useFormContext();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
      <ForgeInput
        label="Full Name"
        name="name"
        modelValue={String(context.values.name ?? '')}
        error={context.touched.name ? context.errors.name : undefined}
        onUpdateModelValue={(v) => context.setFieldValue('name', v)}
        onBlur={() => context.setFieldTouched('name', true)}
      />
      <ForgeInput
        label="Email"
        name="email"
        type="email"
        modelValue={String(context.values.email ?? '')}
        error={context.touched.email ? context.errors.email : undefined}
        onUpdateModelValue={(v) => context.setFieldValue('email', v)}
        onBlur={() => context.setFieldTouched('email', true)}
      />
      <ForgeButton
        type="submit"
        variant="primary"
      >
        Submit
      </ForgeButton>
    </div>
  );
}

export const Basic: Story = {
  render: () => (
    <ForgeForm
      initialValues={{ name: '', email: '' }}
      validate={(values) => {
        const errors: Record<string, string> = {};
        if (!values.name) {
          errors.name = 'Full name is required';
        }
        if (!values.email) {
          errors.email = 'Email is required';
        }
        return errors;
      }}
      onSubmit={(values) => {
        console.log('Submitted values:', values);
      }}
    >
      <FormFields />
    </ForgeForm>
  ),
};
