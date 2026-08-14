import { h, useState } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeCheckbox, ForgeFormWizard, ForgeInput } from '@mission-platform/forms';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeFormWizard` is the write-once component of `@mission-platform/forms`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/forms` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const STEPS = [
  {
    id: 'account',
    title: 'Account',
    description: 'Login details',
    content: () => <p>Step 1 — create your account.</p>,
  },
  { id: 'profile', title: 'Profile', description: 'About you', content: () => <p>Step 2 — tell us about yourself.</p> },
  { id: 'review', title: 'Review', description: 'Confirm', content: () => <p>Step 3 — review and finish.</p> },
];

const meta = {
  title: 'Organisms/Forms/ForgeFormWizard',
  component: ForgeFormWizard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Cross-framework `ForgeFormWizard` — authored once in the neutral JSX dialect and shipped to all supported frameworks. Each step's body is its `content` prop; a step can be conditional (`when: false` drops it) and validated (`valid: false` blocks Next and the final Finish). Styling comes from the co-located `forge-form-wizard.module.scss`.",
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
    modelValue: 0,
  },
  render: (arguments_) => {
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <ForgeFormWizard
        {...arguments_}
        modelValue={modelValue ?? 0}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeFormWizard>;

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
        content: () => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <ForgeInput
              label="Email"
              type="email"
              autocomplete="email"
              placeholder="ada@example.com"
              required
              modelValue={email}
              error={email !== '' && !emailValid ? 'Enter a valid email address.' : undefined}
              onUpdateModelValue={(value) => setEmail(String(value))}
            />
            <ForgeInput
              label="Password"
              type="password"
              autocomplete="new-password"
              required
              hint="At least 8 characters."
              modelValue={password}
              error={password !== '' && !passwordValid ? 'Password is too short.' : undefined}
              onUpdateModelValue={(value) => setPassword(String(value))}
            />
            <ForgeCheckbox
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
        content: () => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: 0 }}>This step only appears for business sign-ups.</p>
            <ForgeInput
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
        content: () => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: 0 }}>Email: {email === '' ? '—' : email}</p>
            {isBusiness ? <p style={{ margin: 0 }}>Company: {company === '' ? '—' : company}</p> : undefined}
            <ForgeCheckbox
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
      <ForgeFormWizard
        {...arguments_}
        steps={steps}
        modelValue={active}
        onUpdateModelValue={setActive}
        onComplete={() => setCompleted(true)}
      />
    );
  },
};
