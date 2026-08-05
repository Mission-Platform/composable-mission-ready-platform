import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { Tabs } from '@mission-platform/components';

import type { TabItem } from './base-tabs';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const tabs: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'activity', label: 'Activity' },
  { id: 'settings', label: 'Settings', disabled: true },
];

/**
 * `Tabs` is the write-once `BaseTabs` component of `@mission-platform/components`. It renders an ARIA `tablist` with roving
 * `tabindex` + Arrow/Home/End keyboard navigation and optional closable/addable
 * affordances, keeping every inactive panel mounted but `hidden`. Each panel
 * invokes one scoped `panel` **render-prop** with `{ tab }` (passed as the
 * `panel` prop); `v-model` + emits become
 * `onUpdateModelValue`/`onChange`/`onClose`/`onAdd`/`onRename`.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Navigation/BaseTabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Tabs` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders an ARIA `tablist` with roving `tabindex` + keyboard navigation and keeps inactive panels mounted but `hidden`; each panel invokes one scoped `panel` render-prop with `{ tab }`. Styling comes from the co-located `base-tabs.module.scss`.',
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
    const [{ modelValue: active = 'overview' }, updateArguments] = useArgs();

    // `panel` is a render-prop: it receives `{ tab }` and returns the active
    // panel's content.
    const panel = ({ tab }: { tab: TabItem }) => (
      <p style={{ margin: 0 }}>
        Content for the <strong>{tab.label}</strong> tab.
      </p>
    );
    return (
      <Tabs
        {...arguments_}
        modelValue={active}
        panel={panel}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};

export const Pill: Story = { args: { variant: 'pill' } };

export const Closable: Story = { args: { closable: true } };

export const Addable: Story = { args: { addable: true } };

export const ClosableAndAddable: Story = { args: { closable: true, addable: true } };
