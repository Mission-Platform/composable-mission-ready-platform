import { h, type MpElement, type MpProperties } from '@mission-platform/forge';
import { toReactComponent } from '@mission-platform/forge/react';
import { BehaviorSubject, type Observable } from 'rxjs';

import { useObservable } from '@mission-platform/rxjs';

import type { Meta, StoryObj } from '@storybook/react-vite';

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

// Rendered on React through the neutral runtime adapter. Because `useObservable`
// compiles to React's own hooks, the badge subscribes on mount and updates on
// every emission, unsubscribing on unmount.
const StatusBadgeReact = toReactComponent(StatusBadge, 'StatusBadge');

const meta = {
  title: 'Integrations/RxJS/UseObservable',
  component: StatusBadgeReact,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`@mission-platform/rxjs` bridges RxJS `Observable`s into the write-once component model. `useObservable(source, initial)` subscribes to a stream and exposes its latest value as component state. This story renders a neutral component through the React runtime adapter; the badge updates on every emission and unsubscribes on unmount.',
      },
    },
  },
  argTypes: {
    initial: { control: 'text' },
    status$: { control: false },
  },
} satisfies Meta<typeof StatusBadgeReact>;

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
