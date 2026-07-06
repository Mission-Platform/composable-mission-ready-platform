import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { useObservable } from '@mission-platform/rxjs';
import { BehaviorSubject, type Observable } from 'rxjs';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

interface StatusBadgeProperties extends MpProperties {
  /** The stream whose latest value is shown. */
  status$: Observable<string>;
  /** The value rendered until the first emission. */
  initial: string;
}

/**
 * A framework-neutral write-once component that mirrors an RxJS stream into its
 * rendered output via `@mission-platform/rxjs`'s `useObservable`.
 */
function StatusBadge(properties: StatusBadgeProperties): MpElement {
  const status = useObservable(properties.status$, properties.initial);
  return h('span', { class: 'status-badge' }, `Status: ${status}`);
}

// Rendered on Vue through the neutral runtime adapter. The adapter (like SSR) is
// render-once, so the story shows the seeded value; the live subscription runs
// once the component is compiled per-framework by @mission-platform/vite-plugin-jsx.
const StatusBadgeVue = toVueComponent(StatusBadge, 'StatusBadge');

const meta = {
  title: 'Integrations/RxJS/UseObservable',
  component: StatusBadgeVue,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`@mission-platform/rxjs` bridges RxJS `Observable`s into the write-once component model. `useObservable(source, initial)` subscribes to a stream and exposes its latest value as component state. This story renders a neutral component through the Vue runtime adapter (render-once, so it shows the seeded value); in the compiled per-framework build the badge updates on every emission and unsubscribes on unmount.',
      },
    },
  },
  argTypes: {
    initial: { control: 'text' },
    status$: { control: false },
  },
} satisfies Meta<typeof StatusBadgeVue>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { status$: new BehaviorSubject('idle'), initial: 'idle' },
};

export const Connected: Story = {
  args: { status$: new BehaviorSubject('connected'), initial: 'connected' },
};

export const Error: Story = {
  args: { status$: new BehaviorSubject('error'), initial: 'error' },
};
