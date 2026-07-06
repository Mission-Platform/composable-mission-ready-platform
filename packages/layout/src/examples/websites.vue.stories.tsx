import { ApplicationLayout, Container } from '@mission-platform/layouts/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * **Websites** — example marketing / public-site layouts assembled from the
 * `@mission-platform/layouts` primitives.
 *
 * The page shell is the cross-framework {@link ApplicationLayout} (a sticky
 * nav, the scrollable content, and a multi-column footer); a {@link Container}
 * caps each section's reading width, while a `fluid` `Container` powers the
 * full-bleed hero band. Presentational only.
 */
const meta = {
  title: 'Layouts/Examples/Websites',
  component: ApplicationLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Marketing-site layouts built from `@mission-platform/layouts`: an `ApplicationLayout` shell with a sticky nav and a multi-column footer, a `fluid` `Container` for the full-bleed hero band, and `responsive` `Container`s capping the feature sections. Presentational only.',
      },
    },
  },
  args: { stickyHeader: true },
} satisfies Meta<typeof ApplicationLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const NAVBAR =
  'display: flex; align-items: center; justify-content: space-between; padding: var(--mp-spacing-3) var(--mp-spacing-5); background: var(--mp-color-bg-surface); border-bottom: 1px solid var(--mp-color-border-default); color: var(--mp-color-text-primary);';
const NAV_LINKS = 'display: flex; gap: var(--mp-spacing-4); color: var(--mp-color-text-secondary);';
const HERO =
  'padding-block: var(--mp-spacing-12); background: var(--mp-color-primary-default); color: var(--mp-color-text-on-primary); text-align: center;';
const HERO_BTN =
  'display: inline-block; margin-top: var(--mp-spacing-4); padding: var(--mp-spacing-3) var(--mp-spacing-6); background: var(--mp-color-bg-surface); color: var(--mp-color-text-primary); border-radius: var(--mp-radius-sm);';
const SECTION =
  'padding-block: var(--mp-spacing-10); background: var(--mp-color-bg-base); color: var(--mp-color-text-primary);';
const FEATURE =
  'padding: var(--mp-spacing-5); background: var(--mp-color-bg-surface); border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md);';
const FOOTER_COLS =
  'display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: var(--mp-spacing-6); padding: var(--mp-spacing-8) var(--mp-spacing-5); background: var(--mp-color-bg-surface); border-top: 1px solid var(--mp-color-border-default); color: var(--mp-color-text-secondary);';

/** A marketing landing page: a full-bleed hero over a responsive feature grid, with a multi-column footer. */
export const Marketing: Story = {
  render: (arguments_) => ({
    components: { ApplicationLayout, Container },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <ApplicationLayout v-bind="args">
        <template #navbar>
          <div style="${NAVBAR}">
            <strong>Mission Platform</strong>
            <nav style="${NAV_LINKS}"><span>Product</span><span>Pricing</span><span>Docs</span><span>Contact</span></nav>
          </div>
        </template>
        <template #content>
          <section style="${HERO}">
            <Container variant="fluid">
              <h1 style="margin: 0; font-size: var(--mp-size-font-2xl);">Ship composable apps faster</h1>
              <p>One write-once component library for Vue and React.</p>
              <a style="${HERO_BTN}">Get started</a>
            </Container>
          </section>
          <section style="${SECTION}">
            <Container variant="responsive">
              <h2 style="margin-top: 0;">Features</h2>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: var(--mp-spacing-4);">
                <div style="${FEATURE}"><h3 style="margin-top: 0;">Write once</h3><p>Author components in a neutral dialect.</p></div>
                <div style="${FEATURE}"><h3 style="margin-top: 0;">Ship everywhere</h3><p>Compile straight to Vue and React.</p></div>
                <div style="${FEATURE}"><h3 style="margin-top: 0;">Design tokens</h3><p>Theme it all with DTCG tokens.</p></div>
              </div>
            </Container>
          </section>
        </template>
        <template #footer>
          <div style="${FOOTER_COLS}">
            <div><strong>Product</strong><p>Features</p><p>Pricing</p></div>
            <div><strong>Company</strong><p>About</p><p>Careers</p></div>
            <div><strong>Resources</strong><p>Docs</p><p>Blog</p></div>
            <div><strong>Legal</strong><p>Privacy</p><p>Terms</p></div>
          </div>
        </template>
      </ApplicationLayout>
    `,
  }),
};

/** A focused single-call-to-action landing page inside a narrow responsive container. */
export const Landing: Story = {
  render: (arguments_) => ({
    components: { ApplicationLayout, Container },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <ApplicationLayout v-bind="args">
        <template #navbar>
          <div style="${NAVBAR}"><strong>Mission Platform</strong><span>Sign in</span></div>
        </template>
        <template #content>
          <section style="${HERO}">
            <Container variant="fixed" maxWidth="md">
              <h1 style="margin: 0; font-size: var(--mp-size-font-2xl);">The platform for mission-ready teams</h1>
              <p>Join thousands of teams building with Mission Platform.</p>
              <a style="${HERO_BTN}">Request a demo</a>
            </Container>
          </section>
        </template>
        <template #footer>
          <div style="${FOOTER_COLS}"><div>© Mission Platform</div></div>
        </template>
      </ApplicationLayout>
    `,
  }),
};
