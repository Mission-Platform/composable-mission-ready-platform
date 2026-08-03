import { useState } from 'react';

import { Checkbox, FormWizard, Input } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `FormWizard` is the **React** build of the write-once `BaseFormWizard` in
 * `@mission-platform/components`. Each step's body is its `content` `MpChild`
 * prop, labels are plain props, and the `v-model` + `next`/`prev`/`complete`
 * emits become callback props. A step can be **conditional** (`when: false`) and
 * **validated** (`valid: false` blocks Next/Finish). Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const STEPS = [
  { id: 'account', title: 'Account', description: 'Login details', content: <p>Step 1 — create your account.</p> },
  { id: 'profile', title: 'Profile', description: 'About you', content: <p>Step 2 — tell us about yourself.</p> },
  { id: 'review', title: 'Review', description: 'Confirm', content: <p>Step 3 — review and finish.</p> },
];

const meta = {
  title: 'Components/Forms/BaseFormWizard',
  component: FormWizard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Cross-framework `FormWizard` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). Each step's body is its `content` prop; a step can be conditional (`when: false` drops it) and validated (`valid: false` blocks Next and the final Finish). Styling comes from the co-located `base-form-wizard.module.scss`.",
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    linear: { control: 'boolean' },
    // `steps` carry framework elements in their `content` (e.g. `<p>…</p>`),
    // which are circular structures. Storybook's Controls panel serialises arg
    // values (JSON.stringify) to render an ObjectControl, so exposing this arg
    // crashes the panel ("Converting circular structure to JSON"). Disable it.
    steps: { control: false },
  },
  args: {
    steps: STEPS,
    linear: true,
  },
  render: (arguments_) => {
    const [active, setActive] = useState(arguments_.modelValue ?? 0);
    return (
      <FormWizard
        {...arguments_}
        modelValue={active}
        onUpdateModelValue={setActive}
      />
    );
  },
} satisfies Meta<typeof FormWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondStep: Story = { args: { modelValue: 1 } };

export const NonLinear: Story = { args: { linear: false } };

/**
 * A fully interactive wizard that exercises all three behaviours at once:
 * conditional steps (`when`), per-step validation (`valid`), and final-step
 * validation gating `complete`.
 */
export const WithValidationAndConditionalSteps: Story = {
  render: (arguments_) => {
    const [active, setActive] = useState(0);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isBusiness, setIsBusiness] = useState(false);
    const [company, setCompany] = useState('');
    const [accepted, setAccepted] = useState(false);
    const [completed, setCompleted] = useState(false);

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const passwordValid = password.length >= 8;
    const companyValid = company.trim().length > 0;

    const steps = [
      {
        id: 'account',
        title: 'Account',
        description: 'Login details',
        valid: emailValid && passwordValid,
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Input
              label="Email"
              type="email"
              autocomplete="email"
              placeholder="ada@example.com"
              required
              modelValue={email}
              error={email !== '' && !emailValid ? 'Enter a valid email address.' : undefined}
              onUpdateModelValue={(value) => setEmail(String(value))}
            />
            <Input
              label="Password"
              type="password"
              autocomplete="new-password"
              required
              hint="At least 8 characters."
              modelValue={password}
              error={password !== '' && !passwordValid ? 'Password is too short.' : undefined}
              onUpdateModelValue={(value) => setPassword(String(value))}
            />
            <Checkbox
              label="I'm signing up as a business"
              modelValue={isBusiness}
              onUpdateModelValue={(value) => setIsBusiness(Boolean(value))}
            />
          </div>
        ),
      },
      {
        id: 'company',
        title: 'Company',
        description: 'Business details',
        when: isBusiness,
        valid: companyValid,
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: 0 }}>This step only appears for business sign-ups.</p>
            <Input
              label="Company name"
              type="text"
              autocomplete="organization"
              placeholder="Analytical Engines Ltd"
              required
              modelValue={company}
              onUpdateModelValue={(value) => setCompany(String(value))}
            />
          </div>
        ),
      },
      {
        id: 'review',
        title: 'Review',
        description: 'Confirm',
        valid: accepted,
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: 0 }}>Email: {email === '' ? '—' : email}</p>
            {isBusiness ? <p style={{ margin: 0 }}>Company: {company === '' ? '—' : company}</p> : undefined}
            <Checkbox
              label="I accept the terms and conditions"
              modelValue={accepted}
              onUpdateModelValue={(value) => setAccepted(Boolean(value))}
            />
            {completed ? <p style={{ margin: 0, color: 'var(--mp-color-success, green)' }}>✓ All done!</p> : undefined}
          </div>
        ),
      },
    ];

    return (
      <FormWizard
        {...arguments_}
        steps={steps}
        modelValue={active}
        onUpdateModelValue={setActive}
        onComplete={() => setCompleted(true)}
      />
    );
  },
};
