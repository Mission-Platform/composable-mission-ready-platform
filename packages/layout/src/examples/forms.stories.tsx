import { ForgeContainer } from '@mission-platform/layouts';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * **Forms** — example page layouts assembled from the `@mission-platform/layouts`
 * primitives for data-entry screens.
 *
 * Each story constrains the form to a comfortable reading/entry width with a
 * `fixed` {@link ForgeContainer} (so the fields never sprawl on wide screens) and
 * arranges the fields with token-driven inline CSS grids. The examples are
 * presentational only.
 */
const meta = {
  title: 'Layouts/Examples/Forms',
  component: ForgeContainer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Form page layouts built from `@mission-platform/layouts`. A `fixed` `ForgeContainer` caps the form width and centres it; the fields are arranged with design-token inline grids (single column, two column, and a stepped wizard). Presentational only — the inputs are token-styled placeholders, not real form controls.',
      },
    },
  },
} satisfies Meta<typeof ForgeContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

const PAGE = {
  minHeight: '100%',
  paddingBlock: 'var(--mp-spacing-8)',
  background: 'var(--mp-color-bg-base)',
  color: 'var(--mp-color-text-primary)',
};
const CARD = {
  padding: 'var(--mp-spacing-6)',
  background: 'var(--mp-color-bg-surface)',
  border: '1px solid var(--mp-color-border-default)',
  borderRadius: 'var(--mp-radius-md)',
};
const FIELD = { display: 'flex', flexDirection: 'column', gap: 'var(--mp-spacing-1)' };
const LABEL = { fontSize: 'var(--mp-size-font-sm)', color: 'var(--mp-color-text-secondary)' };
const INPUT = {
  height: '2.5rem',
  paddingInline: 'var(--mp-spacing-3)',
  background: 'var(--mp-color-bg-base)',
  border: '1px solid var(--mp-color-border-default)',
  borderRadius: 'var(--mp-radius-sm)',
};
const ACTIONS = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--mp-spacing-3)',
  marginTop: 'var(--mp-spacing-6)',
};
const PRIMARY = {
  padding: 'var(--mp-spacing-2) var(--mp-spacing-5)',
  background: 'var(--mp-color-primary-default)',
  color: 'var(--mp-color-text-on-primary)',
  border: 'none',
  borderRadius: 'var(--mp-radius-sm)',
};
const SECONDARY = {
  padding: 'var(--mp-spacing-2) var(--mp-spacing-5)',
  background: 'transparent',
  color: 'var(--mp-color-text-primary)',
  border: '1px solid var(--mp-color-border-default)',
  borderRadius: 'var(--mp-radius-sm)',
};

/** A classic single-column form inside a narrow `fixed` container — ideal for sign-up / login. */
export const SingleColumn: Story = {
  render: () => (
    <div style={PAGE}>
      <ForgeContainer
        variant="fixed"
        maxWidth="sm"
      >
        <form style={CARD}>
          <h1 style={{ marginTop: 0 }}>Create your account</h1>
          <div style={{ display: 'grid', gap: 'var(--mp-spacing-4)' }}>
            <label style={FIELD}>
              <span style={LABEL}>Full name</span>
              <span style={INPUT}></span>
            </label>
            <label style={FIELD}>
              <span style={LABEL}>Email address</span>
              <span style={INPUT}></span>
            </label>
            <label style={FIELD}>
              <span style={LABEL}>Password</span>
              <span style={INPUT}></span>
            </label>
          </div>
          <div style={ACTIONS}>
            <button
              type="button"
              style={SECONDARY}
            >
              Cancel
            </button>
            <button
              type="button"
              style={PRIMARY}
            >
              Sign up
            </button>
          </div>
        </form>
      </ForgeContainer>
    </div>
  ),
};

/** A two-column field grid for richer records — the grid collapses to one column on narrow screens. */
export const TwoColumn: Story = {
  render: () => (
    <div style={PAGE}>
      <ForgeContainer
        variant="fixed"
        maxWidth="md"
      >
        <form style={CARD}>
          <h1 style={{ marginTop: 0 }}>Profile details</h1>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
              gap: 'var(--mp-spacing-4)',
            }}
          >
            <label style={FIELD}>
              <span style={LABEL}>First name</span>
              <span style={INPUT}></span>
            </label>
            <label style={FIELD}>
              <span style={LABEL}>Last name</span>
              <span style={INPUT}></span>
            </label>
            <label style={FIELD}>
              <span style={LABEL}>Organisation</span>
              <span style={INPUT}></span>
            </label>
            <label style={FIELD}>
              <span style={LABEL}>Role</span>
              <span style={INPUT}></span>
            </label>
            <label style={{ ...FIELD, gridColumn: '1 / -1' }}>
              <span style={LABEL}>Bio</span>
              <span style={{ ...INPUT, height: '5rem' }}></span>
            </label>
          </div>
          <div style={ACTIONS}>
            <button
              type="button"
              style={SECONDARY}
            >
              Discard
            </button>
            <button
              type="button"
              style={PRIMARY}
            >
              Save changes
            </button>
          </div>
        </form>
      </ForgeContainer>
    </div>
  ),
};

/** A multi-step wizard: a step rail above the current step's fields, all width-capped by the container. */
export const Wizard: Story = {
  render: () => (
    <div style={PAGE}>
      <ForgeContainer
        variant="fixed"
        maxWidth="md"
      >
        <ol
          style={{
            display: 'flex',
            gap: 'var(--mp-spacing-2)',
            listStyle: 'none',
            padding: 0,
            margin: '0 0 var(--mp-spacing-5)',
          }}
        >
          <li
            style={{
              flex: 1,
              padding: 'var(--mp-spacing-2)',
              textAlign: 'center',
              borderRadius: 'var(--mp-radius-sm)',
              background: 'var(--mp-color-primary-default)',
              color: 'var(--mp-color-text-on-primary)',
            }}
          >
            1. Account
          </li>
          <li
            style={{
              flex: 1,
              padding: 'var(--mp-spacing-2)',
              textAlign: 'center',
              borderRadius: 'var(--mp-radius-sm)',
              background: 'var(--mp-color-bg-surface)',
              border: '1px solid var(--mp-color-border-default)',
              color: 'var(--mp-color-text-secondary)',
            }}
          >
            2. Billing
          </li>
          <li
            style={{
              flex: 1,
              padding: 'var(--mp-spacing-2)',
              textAlign: 'center',
              borderRadius: 'var(--mp-radius-sm)',
              background: 'var(--mp-color-bg-surface)',
              border: '1px solid var(--mp-color-border-default)',
              color: 'var(--mp-color-text-secondary)',
            }}
          >
            3. Review
          </li>
        </ol>
        <form style={CARD}>
          <h2 style={{ marginTop: 0 }}>Account</h2>
          <div style={{ display: 'grid', gap: 'var(--mp-spacing-4)' }}>
            <label style={FIELD}>
              <span style={LABEL}>Workspace name</span>
              <span style={INPUT}></span>
            </label>
            <label style={FIELD}>
              <span style={LABEL}>Subdomain</span>
              <span style={INPUT}></span>
            </label>
          </div>
          <div style={ACTIONS}>
            <button
              type="button"
              style={SECONDARY}
            >
              Back
            </button>
            <button
              type="button"
              style={PRIMARY}
            >
              Continue
            </button>
          </div>
        </form>
      </ForgeContainer>
    </div>
  ),
};
