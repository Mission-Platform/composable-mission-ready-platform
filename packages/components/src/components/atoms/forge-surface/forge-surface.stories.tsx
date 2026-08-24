import { ForgeSurface } from '@mission-platform/components';

import type { SurfaceProperties } from './forge-surface';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Atoms/Layout/ForgeSurface',
  component: ForgeSurface,
  tags: ['autodocs'],
  argTypes: {
    elevation: { control: 'select', options: [0, 1, 2, 3] },
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
    rounded: { control: 'select', options: ['none', 'sm', 'md', 'lg', 'xl'] },
    as: { control: 'text' },
  },
  args: { elevation: 0, padding: 'md', rounded: 'lg', as: 'div' },
  render: (arguments_) => <ForgeSurface {...arguments_}>Surface content</ForgeSurface>,
} satisfies Meta<SurfaceProperties>;

export default meta;
type Story = StoryObj<SurfaceProperties>;

export const Default: Story = {};
export const Elevated: Story = { args: { elevation: 3 } };
export const WithRegions: Story = {
  args: { as: 'section', elevation: 2, padding: 'sm', rounded: 'md' },
  render: (arguments_) => <ForgeSurface {...arguments_}>Surface content</ForgeSurface>,
};
