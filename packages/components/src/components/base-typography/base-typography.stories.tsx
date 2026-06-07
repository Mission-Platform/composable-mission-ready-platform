import BaseBadge from '../base-badge/base-badge.vue';
import BaseCard from '../base-card/base-card.vue';
import BaseTag from '../base-tag/base-tag.vue';

import BaseTypography from './base-typography.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const VARIANTS = [
  'display',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'body-lg',
  'body-md',
  'body-sm',
  'body-xs',
  'label',
  'caption',
  'code',
] as const;

const meta = {
  title: 'Components/Display/Typography',
  component: BaseTypography,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    weight: { control: 'select', options: ['regular', 'medium', 'semibold', 'bold'] },
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'tertiary', 'disabled', 'inverse', 'inherit'],
    },
    align: { control: 'select', options: ['start', 'center', 'end'] },
    as: { control: 'text' },
    truncate: { control: 'boolean' },
  },
  args: {
    variant: 'body-md',
    color: 'primary',
    truncate: false,
  },
  render: (arguments_) => <BaseTypography {...arguments_}>The quick brown fox jumps over the lazy dog.</BaseTypography>,
} satisfies Meta<typeof BaseTypography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// ── Heading variants ──────────────────────────────────────────────────────────

export const Display: Story = {
  args: { variant: 'display' },
  render: (arguments_) => <BaseTypography {...arguments_}>Display Heading</BaseTypography>,
};

export const H1: Story = {
  args: { variant: 'h1' },
  render: (arguments_) => <BaseTypography {...arguments_}>Heading 1</BaseTypography>,
};

export const H2: Story = {
  args: { variant: 'h2' },
  render: (arguments_) => <BaseTypography {...arguments_}>Heading 2</BaseTypography>,
};

export const H3: Story = {
  args: { variant: 'h3' },
  render: (arguments_) => <BaseTypography {...arguments_}>Heading 3</BaseTypography>,
};

export const H4: Story = {
  args: { variant: 'h4' },
  render: (arguments_) => <BaseTypography {...arguments_}>Heading 4</BaseTypography>,
};

export const H5: Story = {
  args: { variant: 'h5' },
  render: (arguments_) => <BaseTypography {...arguments_}>Heading 5</BaseTypography>,
};

export const H6: Story = {
  args: { variant: 'h6' },
  render: (arguments_) => <BaseTypography {...arguments_}>Heading 6</BaseTypography>,
};

// ── Body variants ─────────────────────────────────────────────────────────────

export const BodyLg: Story = { args: { variant: 'body-lg' } };
export const BodyMd: Story = { args: { variant: 'body-md' } };
export const BodySm: Story = { args: { variant: 'body-sm' } };
export const BodyXs: Story = { args: { variant: 'body-xs' } };

// ── Utility variants ──────────────────────────────────────────────────────────

export const Label: Story = {
  args: { variant: 'label' },
  render: (arguments_) => <BaseTypography {...arguments_}>Form label text</BaseTypography>,
};

export const Caption: Story = {
  args: { variant: 'caption' },
  render: (arguments_) => <BaseTypography {...arguments_}>Helper caption text</BaseTypography>,
};

export const Code: Story = {
  args: { variant: 'code' },
  render: (arguments_) => <BaseTypography {...arguments_}>{'const value = 42'}</BaseTypography>,
};

// ── Color variants ────────────────────────────────────────────────────────────

export const ColorSecondary: Story = { args: { color: 'secondary' } };
export const ColorTertiary: Story = { args: { color: 'tertiary' } };
export const ColorDisabled: Story = { args: { color: 'disabled' } };

// ── Weight overrides ──────────────────────────────────────────────────────────

export const WeightBold: Story = { args: { weight: 'bold' } };
export const WeightSemibold: Story = { args: { weight: 'semibold' } };
export const WeightMedium: Story = { args: { weight: 'medium' } };
export const WeightRegular: Story = { args: { weight: 'regular' } };

// ── Alignment ─────────────────────────────────────────────────────────────────

export const AlignCenter: Story = { args: { align: 'center' } };
export const AlignEnd: Story = { args: { align: 'end' } };

// ── Truncate ──────────────────────────────────────────────────────────────────

export const Truncate: Story = {
  args: { truncate: true },
  render: (arguments_) => (
    <div style={{ width: '200px' }}>
      <BaseTypography {...arguments_}>
        This is a very long text that should be truncated when it overflows its container.
      </BaseTypography>
    </div>
  ),
};

// ── Truncate with popup ───────────────────────────────────────────────────────

const truncatePopupRows = [
  'A short label',
  'This row has a much longer description text that will definitely overflow the narrow column',
  'Medium length entry that might or might not overflow',
  'Another very long piece of text that should trigger the popup behaviour on hover so you can read the full content',
];

export const TruncatePopup: Story = {
  name: 'Truncate with Popup',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', maxWidth: '640px' }}>
      <div>
        <BaseTypography
          variant="label"
          color="secondary"
          style={{ marginBottom: '0.5rem', display: 'block' }}
        >
          Narrow container (200 px) — hover to see full text
        </BaseTypography>
        <div
          style={{
            width: '200px',
            border: '1px dashed var(--mp-color-border-default)',
            borderRadius: '4px',
            padding: '4px 8px',
          }}
        >
          <BaseTypography
            variant="body-md"
            truncatePopup
          >
            This is a very long sentence that will be truncated inside its narrow container.
          </BaseTypography>
        </div>
      </div>

      <div>
        <BaseTypography
          variant="label"
          color="secondary"
          style={{ marginBottom: '0.5rem', display: 'block' }}
        >
          Table-cell simulation — hover rows to reveal full content
        </BaseTypography>
        <div
          style={{
            width: '300px',
            border: '1px solid var(--mp-color-border-default)',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          {truncatePopupRows.map((row) => (
            <div
              key={row}
              style={{ padding: '8px 12px', borderBottom: '1px solid var(--mp-color-border-default)' }}
            >
              <BaseTypography
                variant="body-sm"
                truncatePopup
              >
                {row}
              </BaseTypography>
            </div>
          ))}
        </div>
      </div>

      <div>
        <BaseTypography
          variant="label"
          color="secondary"
          style={{ marginBottom: '0.5rem', display: 'block' }}
        >
          Short text — no popup (text is not overflowing)
        </BaseTypography>
        <div
          style={{
            width: '400px',
            border: '1px dashed var(--mp-color-border-default)',
            borderRadius: '4px',
            padding: '4px 8px',
          }}
        >
          <BaseTypography
            variant="body-md"
            truncatePopup
          >
            Short
          </BaseTypography>
        </div>
      </div>
    </div>
  ),
};

// ── Polymorphic element ───────────────────────────────────────────────────────

export const PolymorphicAs: Story = {
  args: { variant: 'body-md', as: 'span' },
  render: (arguments_) => <BaseTypography {...arguments_}>Rendered as a {'<span>'} element</BaseTypography>,
};

// ── Full scale showcase ───────────────────────────────────────────────────────

export const TypeScale: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
      <BaseTypography variant="display">Display — The quick brown fox</BaseTypography>
      <BaseTypography variant="h1">H1 — The quick brown fox</BaseTypography>
      <BaseTypography variant="h2">H2 — The quick brown fox</BaseTypography>
      <BaseTypography variant="h3">H3 — The quick brown fox</BaseTypography>
      <BaseTypography variant="h4">H4 — The quick brown fox</BaseTypography>
      <BaseTypography variant="h5">H5 — The quick brown fox</BaseTypography>
      <BaseTypography variant="h6">H6 — The quick brown fox</BaseTypography>
      <hr style={{ border: 'none', borderTop: '1px solid var(--mp-color-border-default)', margin: '0.5rem 0' }} />
      <BaseTypography variant="body-lg">body-lg — The quick brown fox jumps over the lazy dog.</BaseTypography>
      <BaseTypography variant="body-md">body-md — The quick brown fox jumps over the lazy dog.</BaseTypography>
      <BaseTypography variant="body-sm">body-sm — The quick brown fox jumps over the lazy dog.</BaseTypography>
      <BaseTypography variant="body-xs">body-xs — The quick brown fox jumps over the lazy dog.</BaseTypography>
      <hr style={{ border: 'none', borderTop: '1px solid var(--mp-color-border-default)', margin: '0.5rem 0' }} />
      <BaseTypography variant="label">label — Form label text</BaseTypography>
      <BaseTypography variant="caption">caption — Helper caption text</BaseTypography>
      <BaseTypography variant="code">{'code — const value = 42'}</BaseTypography>
    </div>
  ),
};

// ── In-context usage showcase ─────────────────────────────────────────────────

export const InContext: Story = {
  name: 'In Context (Used in Components)',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1.5rem', maxWidth: '640px' }}>
      <BaseCard
        v-slots={{
          header: () => 'Release Notes — v2.0',
          default: () => (
            <p>
              BaseTypography is now used throughout all library components. It ensures consistent font sizing, weight,
              color, and line-height by mapping each semantic variant to the correct design token.
            </p>
          ),
          footer: () => 'Published 31 May 2026 · 2 min read',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <BaseTypography variant="h4">Typography in Action</BaseTypography>
        <BaseTypography
          variant="body-md"
          color="secondary"
        >
          Every variant automatically picks the correct element, font size, weight, and color token. Use the{' '}
          <BaseTypography
            variant="code"
            as="span"
          >
            as
          </BaseTypography>{' '}
          prop to override the rendered element without losing the visual style.
        </BaseTypography>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <BaseTypography
          variant="label"
          color="secondary"
        >
          Status:
        </BaseTypography>
        <BaseBadge variant="success">Stable</BaseBadge>
        <BaseBadge variant="info">v2.0</BaseBadge>
        <BaseBadge variant="warning">Beta</BaseBadge>
        <BaseBadge variant="danger">Deprecated</BaseBadge>
        <BaseBadge variant="neutral">Neutral</BaseBadge>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <BaseTypography
          variant="label"
          color="secondary"
        >
          Tags:
        </BaseTypography>
        <BaseTag label="Design System" />
        <BaseTag
          label="Vue 3"
          variant="primary"
        />
        <BaseTag label="TypeScript" />
      </div>

      <div>
        <BaseTypography variant="body-md">
          Form fields, tooltips, breadcrumbs, modals, dialogs, tables, and more all use BaseTypography internally to
          render their labels, hints, and captions.
        </BaseTypography>
        <BaseTypography
          variant="caption"
          color="secondary"
          style={{ marginTop: '0.25rem', display: 'block' }}
        >
          Hint: Open any component story to see BaseTypography in the rendered HTML.
        </BaseTypography>
      </div>
    </div>
  ),
};
