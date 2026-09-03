import { ForgeMermaid } from '@mission-platform/content';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeMermaid` renders a Mermaid source string as an accessible diagram.
 * The source remains available as a readable fallback during server-side
 * rendering and when the browser cannot render the diagram.
 * The successful SVG is passed through Forge's explicitly trusted `HtmlContent`
 * boundary; callers should not treat that primitive as a sanitizer.
 */
const meta = {
  title: 'Atoms/Display/ForgeMermaid',
  component: ForgeMermaid,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeMermaid` diagram renderer. Mermaid is rendered client-side as trusted SVG through `HtmlContent`, while the original source remains available for SSR, loading, and error states.',
      },
    },
  },
  argTypes: {
    code: { control: 'text' },
  },
  args: {
    code: ['flowchart LR', '  Authoring --> SemanticIR', '  SemanticIR --> NativeBuild'].join('\n'),
  },
} satisfies Meta<typeof ForgeMermaid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Flowchart: Story = {};

export const ClusteredFlowchart: Story = {
  args: {
    code: [
      'flowchart LR',
      '  subgraph ContentPipeline[Content pipeline]',
      '    Markdown --> Mermaid',
      '    Mermaid --> SVG',
      '  end',
      '  SVG --> Browser',
    ].join('\n'),
  },
};

export const SequenceDiagram: Story = {
  args: {
    code: [
      'sequenceDiagram',
      '  User->>Planner: Request schedule',
      '  activate Planner',
      '  Planner-->>User: Return capacity',
      '  Note over User,Planner: Tokenized sequence surfaces',
      '  deactivate Planner',
    ].join('\n'),
  },
};

export const StatusClassPalette: Story = {
  args: {
    code: [
      'flowchart LR',
      '  classDef primary fill:var(--mp-color-primary-subtle),stroke:var(--mp-color-primary-default),color:var(--mp-color-primary-text)',
      '  classDef success fill:var(--mp-color-success-subtle),stroke:var(--mp-color-success-default),color:var(--mp-color-success-text)',
      '  classDef warning fill:var(--mp-color-warning-subtle),stroke:var(--mp-color-warning-default),color:var(--mp-color-warning-text)',
      '  classDef danger fill:var(--mp-color-danger-subtle),stroke:var(--mp-color-danger-default),color:var(--mp-color-danger-text)',
      '  classDef info fill:var(--mp-color-info-subtle),stroke:var(--mp-color-info-default),color:var(--mp-color-info-text)',
      '  Primary[Primary]:::primary --> Success[Success]:::success',
      '  Success --> Warning[Warning]:::warning',
      '  Warning --> Danger[Danger]:::danger',
      '  Danger --> Info[Info]:::info',
    ].join('\n'),
  },
};

export const InvalidSourceFallback: Story = {
  args: {
    code: 'not valid Mermaid syntax',
  },
};
