import { BaseBadge, BaseCard, BaseProgressBar } from '../..';

import BaseInView from './base-in-view.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Layout/InView',
  component: BaseInView,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    animation: {
      control: 'select',
      options: ['fade', 'slide-up', 'slide-left', 'slide-right', 'scale', 'none'],
    },
    threshold: { control: { type: 'number', min: 0, max: 1, step: 0.05 } },
    duration: { control: { type: 'number', min: 100, max: 2000, step: 100 } },
    delay: { control: { type: 'number', min: 0, max: 1000, step: 50 } },
    once: { control: 'boolean' },
    tag: { control: 'text' },
  },
  args: {
    animation: 'fade',
    threshold: 0.15,
    duration: 500,
    delay: 0,
    once: true,
    tag: 'div',
  },
} satisfies Meta<typeof BaseInView>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper: produce a bunch of spacer + content blocks so the user must scroll
const SCROLL_INTRO = `
  <p style="margin: 0 0 var(--mp-spacing-3); font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">
    ↓ Scroll down to see the InView animations trigger.
  </p>
  <div style="height: 600px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--mp-color-border-default); border-radius: var(--mp-radius-md); color: var(--mp-color-text-tertiary); font-size: var(--mp-font-size-sm);">
    Scroll past this spacer
  </div>
`;

export const FadeIn: Story = {
  render: () => ({
    components: { BaseInView, BaseCard },
    template: `
      <div style="max-width: 600px;">
        ${SCROLL_INTRO}
        <BaseInView animation="fade" :duration="600" style="margin-top: var(--mp-spacing-6);">
          <BaseCard bordered>
            <template #header>Fade In</template>
            This card fades in when it enters the viewport. The IntersectionObserver fires once and disconnects.
          </BaseCard>
        </BaseInView>
        <BaseInView animation="fade" :duration="600" :delay="200" style="margin-top: var(--mp-spacing-4);">
          <BaseCard bordered>
            <template #header>Fade In (200ms delay)</template>
            Staggered with a 200ms delay for a cascading effect.
          </BaseCard>
        </BaseInView>
        <BaseInView animation="fade" :duration="600" :delay="400" style="margin-top: var(--mp-spacing-4);">
          <BaseCard bordered>
            <template #header>Fade In (400ms delay)</template>
            Third card in the cascade, delayed 400ms.
          </BaseCard>
        </BaseInView>
      </div>
    `,
  }),
};

export const SlideUp: Story = {
  render: () => ({
    components: { BaseInView, BaseCard },
    template: `
      <div style="max-width: 600px;">
        ${SCROLL_INTRO}
        <BaseInView animation="slide-up" :duration="500" style="margin-top: var(--mp-spacing-6);">
          <BaseCard bordered>
            <template #header>Slide Up</template>
            Slides up from 24px below its final position as it enters the viewport.
          </BaseCard>
        </BaseInView>
        <BaseInView animation="slide-up" :duration="500" :delay="150" style="margin-top: var(--mp-spacing-4);">
          <BaseCard bordered>
            <template #header>Slide Up (staggered)</template>
            With a 150ms delay for a staggered cascade.
          </BaseCard>
        </BaseInView>
      </div>
    `,
  }),
};

export const AllAnimations: Story = {
  render: () => ({
    components: { BaseInView, BaseCard },
    template: `
      <div style="max-width: 700px; display: flex; flex-direction: column; gap: var(--mp-spacing-4);">
        ${SCROLL_INTRO}
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--mp-spacing-4); margin-top: var(--mp-spacing-6);">
          <BaseInView animation="fade">
            <BaseCard bordered><template #header>fade</template>opacity 0 → 1</BaseCard>
          </BaseInView>
          <BaseInView animation="slide-up" :delay="100">
            <BaseCard bordered><template #header>slide-up</template>translateY(24px) → 0</BaseCard>
          </BaseInView>
          <BaseInView animation="slide-left" :delay="200">
            <BaseCard bordered><template #header>slide-left</template>translateX(24px) → 0</BaseCard>
          </BaseInView>
          <BaseInView animation="slide-right" :delay="300">
            <BaseCard bordered><template #header>slide-right</template>translateX(-24px) → 0</BaseCard>
          </BaseInView>
          <BaseInView animation="scale" :delay="400">
            <BaseCard bordered><template #header>scale</template>scale(0.92) → 1</BaseCard>
          </BaseInView>
          <BaseInView animation="none" :delay="0">
            <BaseCard bordered><template #header>none</template>No animation — always visible</BaseCard>
          </BaseInView>
        </div>
      </div>
    `,
  }),
};

export const RepeatOnScroll: Story = {
  render: () => ({
    components: { BaseInView, BaseCard, BaseBadge },
    template: `
      <div style="max-width: 600px;">
        ${SCROLL_INTRO}
        <BaseInView animation="fade" :once="false" :duration="400" style="margin-top: var(--mp-spacing-6);">
          <template #default="{ inView }">
            <BaseCard bordered>
              <template #header>
                <span>Repeating Observer</span>
                <BaseBadge :variant="inView ? 'success' : 'default'" style="margin-left: var(--mp-spacing-2);">
                  {{ inView ? 'in view' : 'out of view' }}
                </BaseBadge>
              </template>
              This card uses <code>:once="false"</code> — it fades in/out each time it enters/leaves the viewport.
              Scroll past it and back to see the badge toggle.
            </BaseCard>
          </template>
        </BaseInView>
        <div style="height: 800px; display: flex; align-items: center; justify-content: center; color: var(--mp-color-text-tertiary); font-size: var(--mp-font-size-sm);">
          Scroll back up to see the card disappear and reappear
        </div>
      </div>
    `,
  }),
};

export const LazyProgressBars: Story = {
  render: () => ({
    components: { BaseInView, BaseProgressBar, BaseCard },
    template: `
      <div style="max-width: 480px;">
        ${SCROLL_INTRO}
        <BaseInView animation="slide-up" :duration="600" style="margin-top: var(--mp-spacing-6);">
          <template #default="{ inView }">
            <BaseCard bordered>
              <template #header>Mission Readiness</template>
              <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-3);">
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: var(--mp-font-size-xs); color: var(--mp-color-text-secondary); margin-bottom: var(--mp-spacing-1);">
                    <span>Alpha Unit</span><span>85%</span>
                  </div>
                  <BaseProgressBar :value="inView ? 85 : 0" />
                </div>
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: var(--mp-font-size-xs); color: var(--mp-color-text-secondary); margin-bottom: var(--mp-spacing-1);">
                    <span>Bravo Unit</span><span>62%</span>
                  </div>
                  <BaseProgressBar :value="inView ? 62 : 0" />
                </div>
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: var(--mp-font-size-xs); color: var(--mp-color-text-secondary); margin-bottom: var(--mp-spacing-1);">
                    <span>Charlie Unit</span><span>91%</span>
                  </div>
                  <BaseProgressBar :value="inView ? 91 : 0" />
                </div>
              </div>
            </BaseCard>
          </template>
        </BaseInView>
      </div>
    `,
  }),
};

export const StaggeredCardGrid: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    components: { BaseInView, BaseCard, BaseBadge },
    setup() {
      const cards = [
        { title: 'Active Missions', value: '12', badge: 'success', badgeText: '+2 today' },
        { title: 'Units Deployed', value: '47', badge: 'information', badgeText: 'Across 5 regions' },
        { title: 'Alerts', value: '3', badge: 'warning', badgeText: 'Pending review' },
        { title: 'Reports Due', value: '8', badge: 'error', badgeText: 'Overdue' },
        { title: 'Completed', value: '124', badge: 'default', badgeText: 'This month' },
        { title: 'Operatives', value: '280', badge: 'primary', badgeText: 'On assignment' },
      ];
      return { cards };
    },
    template: `
      <div style="max-width: 720px;">
        ${SCROLL_INTRO}
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--mp-spacing-4); margin-top: var(--mp-spacing-6);">
          <BaseInView
            v-for="(card, i) in cards"
            :key="card.title"
            animation="slide-up"
            :duration="500"
            :delay="i * 80"
          >
            <BaseCard bordered style="text-align: center;">
              <template #header>
                <span style="font-size: var(--mp-font-size-xs); color: var(--mp-color-text-secondary);">{{ card.title }}</span>
              </template>
              <span style="font-size: var(--mp-font-size-3xl); font-weight: var(--mp-font-weight-bold); color: var(--mp-color-text-primary); display: block;">{{ card.value }}</span>
              <template #footer>
                <BaseBadge :variant="card.badge">{{ card.badgeText }}</BaseBadge>
              </template>
            </BaseCard>
          </BaseInView>
        </div>
      </div>
    `,
  }),
};
