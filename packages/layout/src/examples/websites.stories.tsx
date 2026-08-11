import { h } from '@mission-platform/forge';
import { renderWithSlots } from '@mission-platform/storybook-framework/slots';

import { ForgeApplicationLayout, ForgeContainer } from '@mission-platform/layouts';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * **Websites** — example marketing / public-site layouts assembled from the
 * `@mission-platform/layouts` primitives.
 *
 * The page shell is the cross-framework {@link ForgeApplicationLayout} (a sticky
 * nav, the scrollable content, and a multi-column footer); a {@link ForgeContainer}
 * caps each section's reading width, while a `fluid` `ForgeContainer` powers the
 * full-bleed hero band. Presentational only.
 */
const meta = {
  title: 'Layouts/Examples/Websites',
  component: ForgeApplicationLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Marketing-site layouts built from `@mission-platform/layouts`: an `ForgeApplicationLayout` shell with a sticky nav and a multi-column footer, a `fluid` `ForgeContainer` for the full-bleed hero band, and `responsive` `ForgeContainer`s capping the feature sections. Presentational only.',
      },
    },
  },
  args: { stickyHeader: true },
} satisfies Meta<typeof ForgeApplicationLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const NAVBAR = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--mp-spacing-3) var(--mp-spacing-5)',
  background: 'var(--mp-color-bg-surface)',
  borderBottom: '1px solid var(--mp-color-border-default)',
  color: 'var(--mp-color-text-primary)',
};
const NAV_LINKS = { display: 'flex', gap: 'var(--mp-spacing-4)', color: 'var(--mp-color-text-secondary)' };
const HERO = {
  paddingBlock: 'var(--mp-spacing-12)',
  background: 'var(--mp-color-primary-default)',
  color: 'var(--mp-color-text-on-primary)',
  textAlign: 'center' as const,
};
const HERO_BTN = {
  display: 'inline-block',
  marginTop: 'var(--mp-spacing-4)',
  padding: 'var(--mp-spacing-3) var(--mp-spacing-6)',
  background: 'var(--mp-color-bg-surface)',
  color: 'var(--mp-color-text-primary)',
  borderRadius: 'var(--mp-radius-sm)',
  textDecoration: 'none',
};
const SECTION = {
  paddingBlock: 'var(--mp-spacing-10)',
  background: 'var(--mp-color-bg-base)',
  color: 'var(--mp-color-text-primary)',
};
const FEATURE = {
  padding: 'var(--mp-spacing-5)',
  background: 'var(--mp-color-bg-surface)',
  border: '1px solid var(--mp-color-border-default)',
  borderRadius: 'var(--mp-radius-md)',
};
const FOOTER_COLS = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))',
  gap: 'var(--mp-spacing-6)',
  padding: 'var(--mp-spacing-8) var(--mp-spacing-5)',
  background: 'var(--mp-color-bg-surface)',
  borderTop: '1px solid var(--mp-color-border-default)',
  color: 'var(--mp-color-text-secondary)',
};

/** A marketing landing page: a full-bleed hero over a responsive feature grid, with a multi-column footer.
 *
 * `navbar`, `content` and `footer` are **named slots**, not props: only the
 * React/Solid builds read them as `properties.navbar`, while Vue renders
 * `renderSlot($slots, 'navbar')`, Svelte expects a snippet and the web
 * component a light-DOM child. Passing them through `renderWithSlots` is the
 * one shape that works on all five.
 */
export const Marketing: Story = {
  render: (arguments_) =>
    renderWithSlots(
      ForgeApplicationLayout,
      { ...arguments_ },
      {
        navbar: (
          <div style={NAVBAR}>
            <strong>Mission Platform</strong>
            <nav style={NAV_LINKS}>
              <span>Product</span>
              <span>Pricing</span>
              <span>Docs</span>
              <span>Contact</span>
            </nav>
          </div>
        ),
        content: (
          <div>
            <section style={HERO}>
              <ForgeContainer variant="fluid">
                <h1 style={{ margin: 0, fontSize: 'var(--mp-size-font-2xl)' }}>Ship composable apps faster</h1>
                <p>One write-once component library for Vue and React.</p>
                <a style={HERO_BTN}>Get started</a>
              </ForgeContainer>
            </section>
            <section style={SECTION}>
              <ForgeContainer variant="responsive">
                <h2 style={{ marginTop: 0 }}>Features</h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
                    gap: 'var(--mp-spacing-4)',
                  }}
                >
                  <div style={FEATURE}>
                    <h3 style={{ marginTop: 0 }}>Write once</h3>
                    <p>Author components in a neutral dialect.</p>
                  </div>
                  <div style={FEATURE}>
                    <h3 style={{ marginTop: 0 }}>Ship everywhere</h3>
                    <p>Compile straight to Vue and React.</p>
                  </div>
                  <div style={FEATURE}>
                    <h3 style={{ marginTop: 0 }}>Design tokens</h3>
                    <p>Theme it all with DTCG tokens.</p>
                  </div>
                </div>
              </ForgeContainer>
            </section>
          </div>
        ),
        footer: (
          <div style={FOOTER_COLS}>
            <div>
              <strong>Product</strong>
              <p>Features</p>
              <p>Pricing</p>
            </div>
            <div>
              <strong>Company</strong>
              <p>About</p>
              <p>Careers</p>
            </div>
            <div>
              <strong>Resources</strong>
              <p>Docs</p>
              <p>Blog</p>
            </div>
            <div>
              <strong>Legal</strong>
              <p>Privacy</p>
              <p>Terms</p>
            </div>
          </div>
        ),
      },
    ),
};

/** A focused single-call-to-action landing page inside a narrow responsive container. */
export const Landing: Story = {
  render: (arguments_) =>
    renderWithSlots(
      ForgeApplicationLayout,
      { ...arguments_ },
      {
        navbar: (
          <div style={NAVBAR}>
            <strong>Mission Platform</strong>
            <span>Sign in</span>
          </div>
        ),
        content: (
          <section style={HERO}>
            <ForgeContainer
              variant="fixed"
              maxWidth="md"
            >
              <h1 style={{ margin: 0, fontSize: 'var(--mp-size-font-2xl)' }}>The platform for mission-ready teams</h1>
              <p>Join thousands of teams building with Mission Platform.</p>
              <a style={HERO_BTN}>Request a demo</a>
            </ForgeContainer>
          </section>
        ),
        footer: (
          <div style={FOOTER_COLS}>
            <div>© Mission Platform</div>
          </div>
        ),
      },
    ),
};
