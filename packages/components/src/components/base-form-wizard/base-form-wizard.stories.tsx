import { ref } from 'vue';

import BaseFormWizard from './base-form-wizard.vue';

import type { WizardStep } from './base-form-wizard.vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const steps: WizardStep[] = [
  { id: 'personal', title: 'Personal Info', description: 'Your details' },
  { id: 'address', title: 'Address', description: 'Where you live' },
  { id: 'review', title: 'Review', description: 'Confirm & submit' },
];

const meta = {
  title: 'Components/Forms/BaseFormWizard',
  component: BaseFormWizard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: "`BaseFormWizard` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.",
      },
    },
  },
  argTypes: {
    linear: { control: 'boolean' },
  },
  args: {
    steps,
    modelValue: 0,
    linear: true,
  },
} satisfies Meta<typeof BaseFormWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { BaseFormWizard },
    setup() {
      const step = ref(0);
      return { steps, step };
    },
    template: `
      <div style="max-width: 640px; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <BaseFormWizard :steps="steps" v-model="step">
          <template #default="{ index }">
            <div style="padding: 16px 0; min-height: 80px;">
              <p>Content for step {{ index + 1 }}</p>
            </div>
          </template>
        </BaseFormWizard>
      </div>
    `,
  }),
};

export const NonLinear: Story = {
  render: () => ({
    components: { BaseFormWizard },
    setup() {
      const step = ref(0);
      return { steps, step };
    },
    template: `
      <div style="max-width: 640px;">
        <BaseFormWizard :steps="steps" v-model="step" :linear="false">
          <template #default="{ index }">
            <p>Step {{ index + 1 }} content</p>
          </template>
        </BaseFormWizard>
      </div>
    `,
  }),
};
