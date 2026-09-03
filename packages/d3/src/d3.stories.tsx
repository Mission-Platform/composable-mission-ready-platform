import { innerDimensions, useD3 } from '@mission-platform/d3';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';
import { scaleBand, scaleLinear } from 'd3';

/**
 * A small D3 bar chart demonstrating `@mission-platform/d3`. The chart's layout
 * is driven by the package's framework-agnostic `innerDimensions` helper (D3's
 * classic margin convention), while D3 scales + selections draw the bars via
 * the write-once `useD3` hook.
 */
interface D3BarChartProperties {
  width?: number;
  height?: number;
  margin?: number;
  data?: number[];
  color?: string;
}

function D3BarChart({
  width = 480,
  height = 320,
  margin = 24,
  data = [12, 25, 18, 32, 9, 27, 21],
  color = '#4f46e5',
}: D3BarChartProperties) {
  const svg = useD3<SVGSVGElement>(
    (selection) => {
      const { innerWidth, innerHeight, translate } = innerDimensions({ width, height, margin });

      const values = data;
      const x = scaleBand<number>()
        .domain(values.map((_, index) => index))
        .range([0, innerWidth])
        .padding(0.15);
      const y = scaleLinear()
        .domain([0, Math.max(1, ...values)])
        .range([innerHeight, 0]);

      selection.selectAll('*').remove();
      selection
        .append('g')
        .attr('transform', translate)
        .selectAll('rect')
        .data(values)
        .join('rect')
        .attr('x', (_, index) => x(index) ?? 0)
        .attr('y', (value) => y(value))
        .attr('width', x.bandwidth())
        .attr('height', (value) => innerHeight - y(value))
        .attr('rx', 3)
        .attr('fill', color);
    },
    [width, height, margin, data, color],
  );

  return (
    <svg
      ref={svg}
      width={width}
      height={height}
      role="img"
      aria-label="D3 bar chart"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}

const meta = {
  title: 'Integrations/D3/BarChart',
  component: D3BarChart,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`@mission-platform/d3` is the framework-neutral D3 integration. This story draws a bar chart whose layout comes from the package’s pure `innerDimensions` margin-convention helper; the same package ships `useD3` to bind a D3 selection to an element ref inside a write-once component.',
      },
    },
  },
  argTypes: {
    width: { control: { type: 'range', min: 200, max: 800, step: 20 } },
    height: { control: { type: 'range', min: 160, max: 480, step: 20 } },
    margin: { control: { type: 'range', min: 0, max: 80, step: 4 } },
    color: { control: 'color' },
    data: { control: 'object' },
  },
} satisfies Meta<typeof D3BarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tall: Story = { args: { height: 420, data: [4, 9, 14, 22, 30, 41, 52] } };

export const RoomyMargin: Story = { args: { margin: 56, color: '#0891b2' } };
