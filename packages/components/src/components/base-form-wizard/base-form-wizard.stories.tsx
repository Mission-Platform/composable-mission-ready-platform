import { computed, h, ref } from 'vue';

import { Checkbox, FormWizard, Input } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `FormWizard` is the Vue 3 build of the write-once `BaseFormWizard` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const STEPS = [
  { id: 'account', title: 'Account', description: 'Login details', content: h('p', 'Step 1 — create your account.') },
  { id: 'profile', title: 'Profile', description: 'About you', content: h('p', 'Step 2 — tell us about yourself.') },
  { id: 'review', title: 'Review', description: 'Confirm', content: h('p', 'Step 3 — review and finish.') },
];

const meta = {
  title: 'Components/Forms/BaseFormWizard',
  component: FormWizard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Cross-framework `FormWizard` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The SFC `Steps`/`Content`/`Footer` sub-components are inlined; the per-step scoped slot becomes each step's `content` `MpChild` prop, the `useI18n` labels become plain props, and the `v-model` + `next`/`prev`/`complete` emits become callback props. Each step can be made **conditional** (`when: false` drops it from the sequence) and **validated** (`valid: false` blocks Next, the final Finish, and forward indicator jumps); the last visible step's `valid` therefore gates completion (final-step validation). Styling comes from the co-located `base-form-wizard.module.scss`.",
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    linear: { control: 'boolean' },
  },
  args: {
    steps: STEPS,
    linear: true,
  },
  render: (arguments_) => ({
    components: { FormWizard },
    setup() {
      const active = ref(arguments_.modelValue ?? 0);
      return { args: arguments_, active };
    },
    template: '<FormWizard v-bind="args" :model-value="active" @update-model-value="active = $event" />',
  }),
} satisfies Meta<typeof FormWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondStep: Story = { args: { modelValue: 1 } };

export const NonLinear: Story = { args: { linear: false } };

/**
 * A fully interactive wizard that exercises all three behaviours at once:
 *
 * - **Conditional step** — the "Company" step only appears once you tick
 *   *I'm signing up as a business* on the first step (`when`).
 * - **Per-step validation** — *Next* stays disabled until the active step is
 *   valid (a well-formed email + an 8-character password on "Account", a
 *   company name on "Company"), which also blocks forward indicator jumps
 *   (`valid`).
 * - **Final-step validation** — *Finish* stays disabled on the last "Review"
 *   step until the terms checkbox is accepted, gating `complete`.
 */
export const WithValidationAndConditionalSteps: Story = {
  render: (arguments_) => ({
    components: { FormWizard },
    setup() {
      const active = ref(0);
      const email = ref('');
      const password = ref('');
      const isBusiness = ref(false);
      const company = ref('');
      const accepted = ref(false);
      const completed = ref(false);

      const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value));
      const passwordValid = computed(() => password.value.length >= 8);
      const companyValid = computed(() => company.value.trim().length > 0);

      const steps = computed(() => [
        {
          id: 'account',
          title: 'Account',
          description: 'Login details',
          valid: emailValid.value && passwordValid.value,
          content: h('div', { style: 'display: flex; flex-direction: column; gap: 0.75rem;' }, [
            h(Input, {
              label: 'Email',
              type: 'email',
              autocomplete: 'email',
              placeholder: 'ada@example.com',
              required: true,
              modelValue: email.value,
              error: email.value !== '' && !emailValid.value ? 'Enter a valid email address.' : undefined,
              onUpdateModelValue: (value: string | number) => {
                email.value = String(value);
              },
            }),
            h(Input, {
              label: 'Password',
              type: 'password',
              autocomplete: 'new-password',
              required: true,
              hint: 'At least 8 characters.',
              modelValue: password.value,
              error: password.value !== '' && !passwordValid.value ? 'Password is too short.' : undefined,
              onUpdateModelValue: (value: string | number) => {
                password.value = String(value);
              },
            }),
            h(Checkbox, {
              label: "I'm signing up as a business",
              modelValue: isBusiness.value,
              onUpdateModelValue: (value: boolean | string[]) => {
                isBusiness.value = Boolean(value);
              },
            }),
          ]),
        },
        {
          id: 'company',
          title: 'Company',
          description: 'Business details',
          when: isBusiness.value,
          valid: companyValid.value,
          content: h('div', { style: 'display: flex; flex-direction: column; gap: 0.75rem;' }, [
            h('p', { style: 'margin: 0;' }, 'This step only appears for business sign-ups.'),
            h(Input, {
              label: 'Company name',
              type: 'text',
              autocomplete: 'organization',
              placeholder: 'Analytical Engines Ltd',
              required: true,
              modelValue: company.value,
              onUpdateModelValue: (value: string | number) => {
                company.value = String(value);
              },
            }),
          ]),
        },
        {
          id: 'review',
          title: 'Review',
          description: 'Confirm',
          valid: accepted.value,
          content: h('div', { style: 'display: flex; flex-direction: column; gap: 0.75rem;' }, [
            h('p', { style: 'margin: 0;' }, `Email: ${email.value === '' ? '—' : email.value}`),
            isBusiness.value
              ? h('p', { style: 'margin: 0;' }, `Company: ${company.value === '' ? '—' : company.value}`)
              : undefined,
            h(Checkbox, {
              label: 'I accept the terms and conditions',
              modelValue: accepted.value,
              onUpdateModelValue: (value: boolean | string[]) => {
                accepted.value = Boolean(value);
              },
            }),
            completed.value
              ? h('p', { style: 'margin: 0; color: var(--mp-color-success, green);' }, '✓ All done!')
              : undefined,
          ]),
        },
      ]);

      return { args: arguments_, active, steps, completed };
    },
    template: `
      <FormWizard
        v-bind="args"
        :steps="steps"
        :model-value="active"
        @update-model-value="active = $event"
        @complete="completed = true"
      />
    `,
  }),
};
