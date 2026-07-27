'use client';

import { innerDimensions, resolveMargin, useD3 } from '@mission-platform/d3/react';
import { palette } from '@mission-platform/tokens';
import { area, bisector, extent, line, pointer, scaleLinear, scaleTime } from 'd3';

import { useCompactViewport } from '../hooks/use-breakpoint';

/** One point on a time-series chart. */
export interface ChartPoint {
  /** Unix epoch milliseconds. */
  ts: number;
  /** Value on the Y axis. */
  value: number;
}

interface TimeSeriesChartProperties {
  readonly points: ChartPoint[];
  /** Accent colour for the line/area/dot. Defaults to a design-token colour. */
  readonly color?: string;
  /** Formats a Y value for the axis labels and the latest-value marker. */
  readonly format?: (value: number) => string;
  /** Message shown until at least two points are available. */
  readonly emptyLabel?: string;
  readonly height?: number;
}

const MARGIN = resolveMargin({ top: 12, right: 14, bottom: 22, left: 44 });
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const POINT_IN_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

/** Default accent pulled from the shared design tokens. */
const DEFAULT_COLOR = palette.color['primary-dark'];

/**
 * A small time-series chart driven by **`@mission-platform/d3`**'s `useD3`
 * React hook: D3 owns the drawing (scales, line/area shapes, axis ticks) against
 * the bound `<svg>` selection, while React owns the element's lifecycle. The
 * chart width adapts to the viewport via `@mission-platform/breakpoints`, its
 * inner box via the package's margin-convention helpers, and its accent colour
 * from `@mission-platform/tokens`.
 */
export function TimeSeriesChart({
  points,
  color = DEFAULT_COLOR,
  format = (value) => value.toFixed(0),
  emptyLabel = 'Collecting data…',
  height = 168,
}: TimeSeriesChartProperties) {
  const compact = useCompactViewport();
  const width = compact ? 340 : 640;

  const reference = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (points.length < 2) {
        return;
      }

      const { innerWidth, innerHeight } = innerDimensions({ width, height, margin: MARGIN });
      const [minTs, maxTs] = extent(points, (point) => point.ts) as [number, number];
      const maxValue = Math.max(...points.map((point) => point.value), 1);

      const x = scaleTime().domain([minTs, maxTs]).range([0, innerWidth]);
      const y = scaleLinear().domain([0, maxValue]).nice().range([innerHeight, 0]);

      const linePath =
        line<ChartPoint>()
          .x((point) => x(point.ts))
          .y((point) => y(point.value))(points) ?? '';
      const areaPath =
        area<ChartPoint>()
          .x((point) => x(point.ts))
          .y0(innerHeight)
          .y1((point) => y(point.value))(points) ?? '';

      const root = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

      // Y grid lines + labels.
      const yTick = root
        .selectAll('g.chart__ytick')
        .data(y.ticks(4))
        .join('g')
        .attr('class', 'chart__ytick')
        .attr('transform', (value) => `translate(0,${y(value)})`);
      yTick.append('line').attr('class', 'chart__grid').attr('x1', 0).attr('x2', innerWidth);
      yTick
        .append('text')
        .attr('class', 'chart__label')
        .attr('x', -8)
        .attr('y', 4)
        .attr('text-anchor', 'end')
        .text((value) => format(value));

      // X labels.
      root
        .selectAll('text.chart__xtick')
        .data(x.ticks(4))
        .join('text')
        .attr('class', 'chart__label chart__xtick')
        .attr('x', (date) => x(date))
        .attr('y', innerHeight + 16)
        .attr('text-anchor', 'middle')
        .text((date) => TIME_FORMAT.format(date));

      // Area + line + latest-value marker.
      root.append('path').attr('class', 'chart__area').attr('d', areaPath).style('fill', color);
      root.append('path').attr('class', 'chart__line').attr('d', linePath).style('stroke', color);

      const last = points.at(-1);
      root
        .append('circle')
        .attr('class', 'chart__dot')
        .attr('cx', x(last.ts))
        .attr('cy', y(last.value))
        .attr('r', 3.5)
        .style('fill', color);

      const hover = root.append('g').attr('class', 'chart__hover').style('display', 'none');
      const hoverLine = hover.append('line').attr('class', 'chart__hover-line').attr('y1', 0).attr('y2', innerHeight);
      const hoverDot = hover.append('circle').attr('class', 'chart__hover-dot').attr('r', 4);
      const hoverLabel = hover.append('text').attr('class', 'chart__hover-label');
      const closestPoint = bisector<ChartPoint, number>((point) => point.ts).center;

      root
        .append('rect')
        .attr('class', 'chart__interaction')
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .on('pointermove', (event) => {
          const [pointerX] = pointer(event);
          const point = points[closestPoint(points, x.invert(pointerX).getTime())];
          const pointX = x(point.ts);
          const pointY = y(point.value);

          hover.style('display', null);
          hoverLine.attr('x1', pointX).attr('x2', pointX);
          hoverDot.attr('cx', pointX).attr('cy', pointY).style('fill', color);
          hoverLabel
            .attr('x', pointX + (pointX > innerWidth / 2 ? -8 : 8))
            .attr('y', pointY < 18 ? pointY + 18 : pointY - 8)
            .attr('text-anchor', pointX > innerWidth / 2 ? 'end' : 'start')
            .text(`${POINT_IN_TIME_FORMAT.format(point.ts)} · ${format(point.value)}`);
        })
        .on('pointerleave', () => hover.style('display', 'none'));
    },
    [points, width, height, color, format],
  );

  if (points.length < 2) {
    return <p className="chart__empty">{emptyLabel}</p>;
  }

  return (
    <svg
      ref={reference}
      className="chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Time series chart"
    />
  );
}
