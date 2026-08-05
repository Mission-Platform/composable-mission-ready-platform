import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { VirtualTabs } from '@mission-platform/components';

import type { TabItem } from '../../molecules/base-tabs';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const tabs: TabItem[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'sent', label: 'Sent' },
  { id: 'drafts', label: 'Drafts' },
];

/**
 * `VirtualTabs` is the write-once `BaseVirtualTabs` component of `@mission-platform/components`. It behaves like `Tabs` but mounts **only the
 * active tab's panel** (virtualised), suited to heavy panel content. The per-tab
 * panel becomes one scoped `panel` render-prop, and `v-model` + emits become
 * callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Navigation/BaseVirtualTabs',
  component: VirtualTabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Cross-framework `VirtualTabs` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It behaves like `Tabs` but mounts only the active tab's panel (virtualised); the per-tab panel becomes one scoped `panel` render-prop. Styling comes from the co-located `base-virtual-tabs.module.scss`.",
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    variant: { control: 'inline-radio', options: ['line', 'pill'] },
    closable: { control: 'boolean' },
    addable: { control: 'boolean' },
  },
  args: {
    tabs,
    variant: 'line',
    closable: false,
    addable: false,
  },
  render: (arguments_) => {
    const [{ modelValue: active = 'inbox' }, updateArguments] = useArgs();

    // `panel` is a render-prop: it receives `{ tab }` and returns the active
    // panel's content.
    const panel = ({ tab }: { tab: TabItem }) => (
      <p style={{ margin: 0 }}>
        Virtualised content for <strong>{tab.label}</strong>.
      </p>
    );
    return (
      <VirtualTabs
        {...arguments_}
        modelValue={active}
        panel={panel}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof VirtualTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};

export const Pill: Story = { args: { variant: 'pill' } };

export const Closable: Story = { args: { closable: true } };
