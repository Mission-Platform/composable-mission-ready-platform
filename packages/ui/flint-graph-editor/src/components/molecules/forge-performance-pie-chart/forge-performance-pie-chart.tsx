import { useD3 } from '@mission-platform/d3';
import { arc as d3Arc, pie as d3Pie, type PieArcDatum } from 'd3';

import styles from './forge-performance-pie-chart.module.scss';

import type { FlintPerformanceMetrics } from '../../../renderer/render-worker';
import type { MpElement } from '@mission-platform/forge-jsx';

export interface PerformanceSliceData {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

export interface ForgePerformancePieChartProperties {
  readonly metrics: FlintPerformanceMetrics;
  readonly width?: number;
  readonly height?: number;
}

/**
 * D3-powered SVG donut chart visualizing rendering and pipeline execution performance metrics.
 */
export function ForgePerformancePieChart(properties: Readonly<ForgePerformancePieChartProperties>): MpElement {
  const { metrics, width = 240, height = 240 } = properties;
  const slices: PerformanceSliceData[] = [
    {
      label: 'Draw & Shader Passes',
      value: Math.max(0.01, metrics.drawPassTimeMs),
      color: '#388bfd',
    },
    {
      label: 'Buffer Upload & Instance Compute',
      value: Math.max(0.01, metrics.bufferUploadTimeMs),
      color: '#a371f7',
    },
    {
      label: 'Spatial Indexing & Culling',
      value: Math.max(0.01, metrics.spatialIndexTimeMs),
      color: '#3fb950',
    },
    {
      label: 'Graph State Updates',
      value: Math.max(0.01, metrics.updateTimeMs),
      color: '#f0883e',
    },
  ];

  const totalValue = slices.reduce((sum, slice) => sum + slice.value, 0);

  const svgReference = useD3<SVGSVGElement>(
    (selection) => {
      selection.selectAll('*').remove();

      const margin = 12;
      const radius = Math.min(width, height) / 2 - margin;
      const innerRadius = radius * 0.58;

      const pieGenerator = d3Pie<PerformanceSliceData>()
        .value((d) => d.value)
        // eslint-disable-next-line unicorn/no-array-sort -- D3 layout generator uses fluent sort method
        .sort((_a, _b) => 0)
        .padAngle(0.03);

      const arcGenerator = d3Arc<PieArcDatum<PerformanceSliceData>>()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .cornerRadius(3);

      const group = selection.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

      const pieData = pieGenerator(slices);

      group
        .selectAll('path')
        .data(pieData)
        .join('path')
        .attr('d', (d) => arcGenerator(d) ?? '')
        .attr('fill', (d) => d.data.color)
        .attr('stroke', '#0d1117')
        .attr('stroke-width', 2);

      group
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.1em')
        .attr('fill', '#f0f6fc')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'var(--mp-font-family-mono, "Datatype", monospace)')
        .text(`${metrics.totalFrameTimeMs.toFixed(1)}ms`);

      group
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.3em')
        .attr('fill', '#8b949e')
        .attr('font-size', '10px')
        .attr('font-family', 'var(--mp-font-family-sans, "Comfortaa", sans-serif)')
        .text(metrics.isFallback ? '2D Raster' : 'WebGPU');
    },
    [
      metrics.drawPassTimeMs,
      metrics.bufferUploadTimeMs,
      metrics.spatialIndexTimeMs,
      metrics.updateTimeMs,
      metrics.totalFrameTimeMs,
      metrics.isFallback,
      width,
      height,
    ],
  );

  return (
    <div className={styles.performanceContainer}>
      <div className={styles.chartWrapper}>
        <svg
          ref={svgReference}
          width={width}
          height={height}
          role="img"
          aria-label="Performance breakdown donut chart"
        />
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Update Time</span>
          <span className={styles.summaryValue}>{metrics.updateTimeMs.toFixed(2)} ms</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Render Time</span>
          <span className={styles.summaryValue}>{metrics.renderTimeMs.toFixed(2)} ms</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Pixel Ratio (DPR)</span>
          <span className={styles.summaryValue}>{metrics.dpr.toFixed(1)}x</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Visible Elements</span>
          <span className={styles.summaryValue}>
            {metrics.visibleNodesCount}N / {metrics.visibleEdgesCount}E / {metrics.visiblePinsCount}P
          </span>
        </div>
      </div>

      <ul className={styles.legendList}>
        {slices.map((slice) => {
          const pct = totalValue > 0 ? ((slice.value / totalValue) * 100).toFixed(0) : '0';
          return (
            <li
              key={slice.label}
              className={styles.legendItem}
            >
              <div className={styles.legendText}>
                <span
                  className={styles.legendIndicator}
                  style={{ backgroundColor: slice.color }}
                />
                <span>{slice.label}</span>
              </div>
              <span className={styles.legendNumbers}>
                {slice.value.toFixed(2)} ms ({pct}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
