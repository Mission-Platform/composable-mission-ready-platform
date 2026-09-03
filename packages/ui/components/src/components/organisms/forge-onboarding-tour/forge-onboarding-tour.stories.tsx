import { useArgs } from 'storybook/preview-api';

import { ForgeOnboardingTour } from '@mission-platform/components';

import type { OnboardingTourProperties } from '@mission-platform/components';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const steps: OnboardingTourProperties['steps'] = [
  {
    title: 'Welcome to missions',
    content: 'This is your mission dashboard.',
    target: '#tour-dashboard',
  },
  { title: 'Create a mission', content: 'Use this action to begin a new mission.', target: '#tour-dashboard' },
];

const meta = {
  title: 'Organisms/Navigation/ForgeOnboardingTour',
  component: ForgeOnboardingTour,
  tags: ['autodocs'],
  args: { steps, title: 'Mission dashboard tour', persist: false },
} satisfies Meta<typeof ForgeOnboardingTour>;

export default meta;
type Story = StoryObj<OnboardingTourProperties>;

export const Interactive: Story = {
  render: (arguments_) => {
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <>
        <button
          id="tour-dashboard"
          type="button"
        >
          Dashboard action
        </button>
        <ForgeOnboardingTour
          {...(arguments_ as OnboardingTourProperties)}
          modelValue={modelValue ?? true}
          onUpdate={(value: boolean) => updateArguments({ modelValue: value })}
        />
      </>
    );
  },
};

export const Open: Story = { args: { modelValue: true, overlay: true } };
