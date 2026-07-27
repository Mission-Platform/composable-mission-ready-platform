import { scaleBand, scaleLinear, select } from 'd3';
import { defineComponent, ref, watchEffect, type PropType } from 'vue';

import { innerDimensions } from '@mission-platform/d3';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * A small D3 bar chart demonstrating `@mission-platform/d3`. The chart's layout
 * is driven by the package's framework-agnostic `innerDimensions` helper (D3's
 * classic margin convention), while D3 scales + selections draw the bars.
 *
 * In a real write-once component you would let `useD3` bind the selection and
 * re-run the draw for you; Storybook uses Vue's own reactivity, so this demo
 * uses the pure `innerDimensions` helper with a native `watchEffect` + a
 * template ref to draw the same chart.
 */
const D3BarChart = defineComponent({
  name: 'D3BarChart',
  props: {
    width: { type: Number, default: 480 },
    height: { type: Number, default: 320 },
    margin: { type: Number, default: 24 },
    data: { type: Array as PropType<number[]>, default: () => [12, 25, 18, 32, 9, 27, 21] },
    color: { type: String, default: '#4f46e5' },
  },
  setup(properties) {
    const svg = ref<SVGSVGElement>();

    watchEffect(() => {
      const element = svg.value;
      if (element === undefined) {
        return;
      }

      const { innerWidth, innerHeight, translate } = innerDimensions({
        width: properties.width,
        height: properties.height,
        margin: properties.margin,
      });

      const values = properties.data;
      const x = scaleBand<number>()
        .domain(values.map((_, index) => index))
        .range([0, innerWidth])
        .padding(0.15);
      const y = scaleLinear()
        .domain([0, Math.max(1, ...values)])
        .range([innerHeight, 0]);

      const root = select(element);
      root.selectAll('*').remove();
      root
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
        .attr('fill', properties.color);
    });

    return { svg };
  },
  template:
    '<svg ref="svg" :width="width" :height="height" role="img" aria-label="D3 bar chart" style="max-width: 100%; height: auto;" />',
});

const meta = {
  title: 'Integrations/D3/BarChart',
  component: D3BarChart,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`@mission-platform/d3` is the framework-neutral D3 integration. This story draws a bar chart whose layout comes from the package’s pure `innerDimensions` margin-convention helper; the same package ships `useD3` to bind a D3 selection to an element ref inside a write-once component (compiled to both React and Vue).',
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
