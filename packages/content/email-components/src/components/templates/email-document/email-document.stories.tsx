import {
  EmailButton,
  EmailContainer,
  EmailDocument,
  EmailSection,
  EmailTypography,
} from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Templates/Email/EmailDocument',
  component: EmailDocument,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A complete email composition built from table-based primitives. The same neutral Forge tree can be serialized for email or previewed through the selected Storybook framework.',
      },
    },
  },
  render: () => (
    <EmailDocument previewText="A preview of this email">
      <EmailContainer>
        <EmailSection>
          <EmailTypography as="h2">Welcome to Mission Platform</EmailTypography>
          <EmailTypography>
            Static inline styles and table layout keep this email usable across clients.
          </EmailTypography>
          <EmailButton href="https://example.com">Read more</EmailButton>
        </EmailSection>
      </EmailContainer>
    </EmailDocument>
  ),
} satisfies Meta<typeof EmailDocument>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CompleteEmail: Story = {};
export const ResponsiveFallback: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Responsive enhancement is optional; the base table layout remains complete without the media-query block.',
      },
    },
  },
};
