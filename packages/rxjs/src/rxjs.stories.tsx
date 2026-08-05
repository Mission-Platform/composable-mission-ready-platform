import { type MpProperties } from '@mission-platform/forge';
import { BehaviorSubject, type Observable } from 'rxjs';

import { useObservable } from '@mission-platform/rxjs';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

interface StatusBadgeProperties extends MpProperties {
  /** The stream whose latest value is shown. */
  status$: Observable<string>;
  /** The value rendered until the first emission. */
  initial: string;
}

/**
 * A framework-neutral write-once component that mirrors an RxJS stream into its
 * rendered output via `@mission-platform/rxjs`'s `useObservable`. Authored in
 * JSX (not a direct `h(...)` call) so the active framework's JSX transform
 * compiles it to that framework's own element — the same write-once pattern the
 * other neutral stories use.
 */
function StatusBadge(properties: StatusBadgeProperties) {
  const status = useObservable(properties.status$, properties.initial);
  return <span class="status-badge">Status: {status}</span>;
}

const meta = {
  title: 'Integrations/RxJS/UseObservable',
  component: StatusBadge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`@mission-platform/rxjs` bridges RxJS `Observable`s into the write-once component model. `useObservable(source, initial)` subscribes to a stream and exposes its latest value as component state. The badge updates on every emission and unsubscribes on unmount.',
      },
    },
  },
  argTypes: {
    initial: { control: 'text' },
    status$: { control: false },
  },
} satisfies Meta<typeof StatusBadge>;

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
