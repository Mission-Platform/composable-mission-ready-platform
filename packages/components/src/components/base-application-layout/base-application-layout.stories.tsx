import { BaseBadge, BaseButton, BaseCard, BaseNavbar, BaseStatusIcon } from '../..';

import BaseApplicationLayout from './base-application-layout.vue';
import { StatusLevels } from './types';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Layout/ApplicationLayout',
  component: BaseApplicationLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    statusLevel: {
      control: 'select',
      options: Object.values(StatusLevels),
    },
  },
  args: {
    statusLevel: StatusLevels.none,
  },
} satisfies Meta<typeof BaseApplicationLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleRender = (statusMessage?: string, statusIcon?: string) => (arguments_: Record<string, unknown>) => ({
  components: {
    BaseApplicationLayout,
    BaseNavbar,
    BaseButton,
    BaseCard,
    BaseBadge,
    BaseStatusIcon,
  },
  setup() {
    return { args: arguments_, statusMessage, statusIcon };
  },
  template: `
    <BaseApplicationLayout v-bind="args">
      <template v-if="statusMessage" #status>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <BaseStatusIcon :status="statusIcon" size="sm" style="color: inherit" />
          {{ statusMessage }}
        </div>
      </template>

      <template #navbar>
        <BaseNavbar brand="Mission Platform" :sticky="true">
          <a href="#" style="color: var(--mp-color-text-primary); text-decoration: none; font-size: 14px; padding: 6px 12px; border-radius: 6px;">Dashboard</a>
          <a href="#" style="color: var(--mp-color-text-primary); text-decoration: none; font-size: 14px; padding: 6px 12px; border-radius: 6px;">Operations</a>
          <a href="#" style="color: var(--mp-color-text-primary); text-decoration: none; font-size: 14px; padding: 6px 12px; border-radius: 6px;">Reports</a>
          <template #end>
            <BaseBadge variant="success">Online</BaseBadge>
            <BaseButton size="sm" variant="secondary">Settings</BaseButton>
            <BaseButton size="sm">Sign out</BaseButton>
          </template>
        </BaseNavbar>
      </template>

      <template #content>
        <div style="padding: var(--mp-spacing-6); display: flex; flex-direction: column; gap: var(--mp-spacing-4);">
          <h1 style="margin: 0; font-size: var(--mp-font-size-2xl); font-weight: var(--mp-font-weight-bold); color: var(--mp-color-text-primary);">Dashboard</h1>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--mp-spacing-4);">
            <BaseCard bordered>
              <template #header>
                <span style="font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">Active Missions</span>
              </template>
              <span style="font-size: var(--mp-font-size-3xl); font-weight: var(--mp-font-weight-bold); color: var(--mp-color-text-primary);">12</span>
            </BaseCard>
            <BaseCard bordered>
              <template #header>
                <span style="font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">Units Deployed</span>
              </template>
              <span style="font-size: var(--mp-font-size-3xl); font-weight: var(--mp-font-weight-bold); color: var(--mp-color-text-primary);">47</span>
            </BaseCard>
            <BaseCard bordered>
              <template #header>
                <span style="font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">Alerts</span>
              </template>
              <div style="display: flex; align-items: center; gap: var(--mp-spacing-2);">
                <span style="font-size: var(--mp-font-size-3xl); font-weight: var(--mp-font-weight-bold); color: var(--mp-color-text-primary);">3</span>
                <BaseBadge variant="warning">Pending</BaseBadge>
              </div>
            </BaseCard>
          </div>

          <BaseCard bordered>
            <template #header>Recent Activity</template>
            <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-3);">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--mp-spacing-2) 0; border-bottom: 1px solid var(--mp-color-border-default);">
                <span style="color: var(--mp-color-text-primary); font-size: var(--mp-font-size-sm);">Mission Alpha-7 started</span>
                <BaseBadge variant="success">Active</BaseBadge>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--mp-spacing-2) 0; border-bottom: 1px solid var(--mp-color-border-default);">
                <span style="color: var(--mp-color-text-primary); font-size: var(--mp-font-size-sm);">Unit Bravo-3 repositioned</span>
                <BaseBadge variant="information">Updated</BaseBadge>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--mp-spacing-2) 0;">
                <span style="color: var(--mp-color-text-primary); font-size: var(--mp-font-size-sm);">Report Q4 submitted</span>
                <BaseBadge variant="default">Archived</BaseBadge>
              </div>
            </div>
          </BaseCard>
        </div>
      </template>

      <template #footer>
        <div style="padding: var(--mp-spacing-3) var(--mp-spacing-6); border-top: 1px solid var(--mp-color-border-default); display: flex; justify-content: space-between; align-items: center; background-color: var(--mp-color-bg-surface);">
          <span style="font-size: var(--mp-font-size-xs); color: var(--mp-color-text-tertiary);">© 2026 Mission Platform</span>
          <span style="font-size: var(--mp-font-size-xs); color: var(--mp-color-text-tertiary);">v1.0.0</span>
        </div>
      </template>
    </BaseApplicationLayout>
  `,
});

export const Default: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  render: sampleRender(),
};

export const Mobile: Story = {
  name: 'Mobile (2xs)',
  parameters: { viewport: { defaultViewport: '2xs' } },
  render: sampleRender(),
};

export const Tablet: Story = {
  name: 'Tablet (sm)',
  parameters: { viewport: { defaultViewport: 'sm' } },
  render: sampleRender(),
};

export const StatusInfo: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { statusLevel: StatusLevels.info },
  render: sampleRender('Scheduled maintenance window tonight at 22:00 UTC.', 'info'),
};

export const StatusWarning: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { statusLevel: StatusLevels.warning },
  render: sampleRender('Degraded connectivity detected in sector 4. Monitoring in progress.', 'warning'),
};

export const StatusError: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { statusLevel: StatusLevels.error },
  render: sampleRender('Critical system fault detected. Immediate action required.', 'error'),
};
