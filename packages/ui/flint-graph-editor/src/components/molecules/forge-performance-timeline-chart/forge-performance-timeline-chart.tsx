import { useD3 } from '@mission-platform/d3';
import { scaleLinear, type Selection } from 'd3';

import styles from './forge-performance-timeline-chart.module.scss';

import type { FlintPerformanceMetrics } from '../../../renderer/render-worker';
import type { MpElement } from '@mission-platform/forge-jsx';

export interface ForgePerformanceTimelineChartProperties {
  readonly history: readonly FlintPerformanceMetrics[];
  readonly currentMetrics: FlintPerformanceMetrics;
  readonly width?: number;
  readonly height?: number;
}

type SvgGroupSelection = Selection<SVGGElement, unknown, null, undefined>;

/**
 * Computes the maximum frame duration across sample metrics.
 */
function calculateSampleMaxTime(samples: readonly FlintPerformanceMetrics[]): number {
  return Math.max(
    20,
    ...samples.map(
      (metricsItem) =>
        metricsItem.totalFrameTimeMs ||
        (metricsItem.drawPassTimeMs ?? 0) +
          (metricsItem.textPassTimeMs ?? 0) +
          (metricsItem.bufferUploadTimeMs ?? 0) +
          (metricsItem.spatialIndexTimeMs ?? 0) +
          (metricsItem.updateTimeMs ?? 0) +
          (metricsItem.layoutTimeMs ?? 0),
    ),
  );
}

/**
 * Renders 60 FPS (16.6ms) and 120 FPS (8.3ms) target threshold lines on the D3 chart.
 */
function renderTargetFpsLines(
  root: SvgGroupSelection,
  yScale: (val: number) => number,
  innerWidth: number,
  maxTime: number,
): void {
  if (maxTime >= 14) {
    const y60 = yScale(16.6);
    root
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', y60)
      .attr('y2', y60)
      .attr('stroke', '#f85149')
      .attr('stroke-dasharray', '4,4')
      .attr('stroke-width', 1)
      .attr('opacity', 0.6);

    root
      .append('text')
      .attr('x', innerWidth + 4)
      .attr('y', y60 + 3)
      .attr('fill', '#f85149')
      .attr('font-size', '9px')
      .attr('font-family', 'var(--mp-font-family-mono, "Datatype", monospace)')
      .text('60 FPS (16.6ms)');
  }

  if (maxTime >= 7) {
    const y120 = yScale(8.3);
    root
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', y120)
      .attr('y2', y120)
      .attr('stroke', '#3fb950')
      .attr('stroke-dasharray', '4,4')
      .attr('stroke-width', 1)
      .attr('opacity', 0.6);

    root
      .append('text')
      .attr('x', innerWidth + 4)
      .attr('y', y120 + 3)
      .attr('fill', '#3fb950')
      .attr('font-size', '9px')
      .attr('font-family', 'var(--mp-font-family-mono, "Datatype", monospace)')
      .text('120 FPS (8.3ms)');
  }
}

interface LayerDefinition {
  readonly key: string;
  readonly color: string;
  readonly getValue: (m: FlintPerformanceMetrics) => number;
}

const TIMELINE_LAYERS: readonly LayerDefinition[] = [
  {
    key: 'updates',
    color: '#f0883e',
    getValue: (m: FlintPerformanceMetrics) => (m.updateTimeMs ?? 0) + (m.layoutTimeMs ?? 0),
  },
  {
    key: 'spatial',
    color: '#3fb950',
    getValue: (m: FlintPerformanceMetrics) => m.spatialIndexTimeMs ?? 0,
  },
  {
    key: 'buffers',
    color: '#a371f7',
    getValue: (m: FlintPerformanceMetrics) => m.bufferUploadTimeMs ?? 0,
  },
  {
    key: 'text',
    color: '#39c5bb',
    getValue: (m: FlintPerformanceMetrics) => m.textPassTimeMs ?? (m.renderTimeMs ? m.renderTimeMs * 0.3 : 0.2),
  },
  {
    key: 'draw',
    color: '#388bfd',
    getValue: (m: FlintPerformanceMetrics) => m.drawPassTimeMs ?? (m.renderTimeMs ? m.renderTimeMs * 0.5 : 0.4),
  },
];

/**
 * Computes stacked Y ranges for each metric layer across all samples.
 */
function computeStackedLayerPoints(
  samples: readonly FlintPerformanceMetrics[],
  layers: readonly LayerDefinition[],
): { y0: number; y1: number }[][] {
  const stackedPoints: { y0: number; y1: number }[][] = layers.map(() => []);
  for (const sample of samples) {
    let runningY = 0;
    for (const [layerIndex, layer] of layers.entries()) {
      const value = layer.getValue(sample);
      const y0 = runningY;
      const y1 = runningY + value;
      stackedPoints[layerIndex]?.push({ y0, y1 });
      runningY = y1;
    }
  }
  return stackedPoints;
}

/**
 * Builds SVG closed polygon path string for a stacked area layer.
 */
function buildAreaPath(
  points: readonly { y0: number; y1: number }[],
  xScale: (val: number) => number,
  yScale: (val: number) => number,
): string {
  let areaD = '';
  for (const [pointIndex, point] of points.entries()) {
    const x = xScale(pointIndex);
    const y = yScale(point.y1);
    areaD += pointIndex === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  for (let reverseIndex = points.length - 1; reverseIndex >= 0; reverseIndex--) {
    const point = points[reverseIndex];
    if (point) {
      const x = xScale(reverseIndex);
      const y = yScale(point.y0);
      areaD += ` L ${x} ${y}`;
    }
  }
  return `${areaD} Z`;
}

/**
 * Builds SVG stroke line path string along the top edge of a layer.
 */
function buildLinePath(
  points: readonly { y0: number; y1: number }[],
  xScale: (val: number) => number,
  yScale: (val: number) => number,
): string {
  let lineD = '';
  for (const [pointIndex, point] of points.entries()) {
    const x = xScale(pointIndex);
    const y = yScale(point.y1);
    lineD += pointIndex === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  return lineD;
}

/**
 * Renders stacked category area polygons and top-stroke boundaries.
 */
function renderStackedAreaLayers(
  root: SvgGroupSelection,
  samples: readonly FlintPerformanceMetrics[],
  xScale: (val: number) => number,
  yScale: (val: number) => number,
): void {
  const stackedPoints = computeStackedLayerPoints(samples, TIMELINE_LAYERS);

  for (const [layerIndex, layer] of TIMELINE_LAYERS.entries()) {
    const points = stackedPoints[layerIndex];
    if (!points || points.length === 0) continue;

    const areaD = buildAreaPath(points, xScale, yScale);
    root.append('path').attr('d', areaD).attr('fill', layer.color).attr('opacity', 0.25);

    const lineD = buildLinePath(points, xScale, yScale);
    root.append('path').attr('d', lineD).attr('fill', 'none').attr('stroke', layer.color).attr('stroke-width', 1.5);
  }
}

/**
 * Renders the total frame time dashed line, latest sample marker, and Y-axis tick labels.
 */
function renderTimelineSummaryAndAxes(
  root: SvgGroupSelection,
  samples: readonly FlintPerformanceMetrics[],
  xScale: (val: number) => number,
  yScale: (val: number) => number,
  innerWidth: number,
  innerHeight: number,
  maxTime: number,
): void {
  let totalLineD = '';
  for (const [sampleIndex, sample] of samples.entries()) {
    const x = xScale(sampleIndex);
    const y = yScale(sample.totalFrameTimeMs);
    totalLineD += sampleIndex === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }

  root
    .append('path')
    .attr('d', totalLineD)
    .attr('fill', 'none')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '2,2');

  const lastIndex = samples.length - 1;
  const lastSample = samples[lastIndex];
  if (lastSample) {
    root
      .append('circle')
      .attr('cx', xScale(lastIndex))
      .attr('cy', yScale(lastSample.totalFrameTimeMs))
      .attr('r', 4)
      .attr('fill', '#ffffff')
      .attr('stroke', '#0d1117')
      .attr('stroke-width', 2);
  }

  root
    .append('line')
    .attr('x1', 0)
    .attr('x2', innerWidth)
    .attr('y1', innerHeight)
    .attr('y2', innerHeight)
    .attr('stroke', '#30363d')
    .attr('stroke-width', 1);

  const yTicks = [0, maxTime * 0.5, maxTime];
  for (const tickValue of yTicks) {
    const y = yScale(tickValue);
    root
      .append('line')
      .attr('x1', -4)
      .attr('x2', innerWidth)
      .attr('y1', y)
      .attr('y2', y)
      .attr('stroke', '#21262d')
      .attr('stroke-width', 1);

    root
      .append('text')
      .attr('x', -8)
      .attr('y', y + 3)
      .attr('text-anchor', 'end')
      .attr('fill', '#8b949e')
      .attr('font-size', '9px')
      .attr('font-family', 'var(--mp-font-family-mono, "Datatype", monospace)')
      .text(`${tickValue.toFixed(0)}ms`);
  }
}

interface CategoryLegendItem {
  readonly label: string;
  readonly color: string;
  readonly value: number;
}

/**
 * Renders individual latency metric category summary cards.
 */
function TimelineCategoryGrid(properties: Readonly<{ metrics: FlintPerformanceMetrics }>): MpElement {
  const { metrics } = properties;
  const updatesValue = (metrics.updateTimeMs ?? 0) + (metrics.layoutTimeMs ?? 0);
  const spatialValue = metrics.spatialIndexTimeMs ?? 0;
  const buffersValue = metrics.bufferUploadTimeMs ?? 0;
  const textValue = metrics.textPassTimeMs ?? (metrics.renderTimeMs ? metrics.renderTimeMs * 0.3 : 0.2);
  const drawValue = metrics.drawPassTimeMs ?? (metrics.renderTimeMs ? metrics.renderTimeMs * 0.5 : 0.4);

  const items: readonly CategoryLegendItem[] = [
    { label: 'Updates & Layout', color: '#f0883e', value: updatesValue },
    { label: 'Spatial Indexing', color: '#3fb950', value: spatialValue },
    { label: 'Buffer Upload', color: '#a371f7', value: buffersValue },
    { label: 'Text & SDF Pass', color: '#39c5bb', value: textValue },
    { label: 'Draw Submissions', color: '#388bfd', value: drawValue },
  ];

  return (
    <div className={styles.categoryGrid}>
      {items.map((item) => (
        <div
          key={item.label}
          className={styles.categoryCard}
        >
          <span className={styles.categoryLabel}>
            <span
              className={styles.categoryIndicator}
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
          <span className={styles.categoryValue}>{item.value.toFixed(2)} ms</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Stacked area and line timeline chart tracking rendering and update performance metrics across animation frames.
 */
export function ForgePerformanceTimelineChart(
  properties: Readonly<ForgePerformanceTimelineChartProperties>,
): MpElement {
  const { history, currentMetrics, width = 640, height = 180 } = properties;

  const margin = { top: 16, right: 36, bottom: 24, left: 36 };
  const innerWidth = Math.max(10, width - margin.left - margin.right);
  const innerHeight = Math.max(10, height - margin.top - margin.bottom);

  // Normalize history: ensure at least 2 samples for line rendering
  const samples =
    history.length >= 2
      ? history
      : [
          currentMetrics,
          {
            ...currentMetrics,
            totalFrameTimeMs: currentMetrics.totalFrameTimeMs * 1.05,
          },
        ];

  const svgReference = useD3<SVGSVGElement>(
    (selection) => {
      selection.selectAll('*').remove();

      const maxTime = calculateSampleMaxTime(samples);

      const xScale = scaleLinear()
        .domain([0, samples.length - 1])
        .range([0, innerWidth]);

      const yScale = scaleLinear()
        .domain([0, maxTime * 1.15])
        .range([innerHeight, 0]);

      const root = selection.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

      renderTargetFpsLines(root, yScale, innerWidth, maxTime);
      renderStackedAreaLayers(root, samples, xScale, yScale);
      renderTimelineSummaryAndAxes(root, samples, xScale, yScale, innerWidth, innerHeight, maxTime);
    },
    [history, currentMetrics, width, height],
  );

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.chartHeader}>
        <span className={styles.chartTitle}>Frame Performance Timeline (Stacked Latency)</span>
        <span
          style={{
            fontSize: '11px',
            color: '#8b949e',
            fontFamily: 'var(--mp-font-family-mono, "Datatype", monospace)',
          }}
        >
          {samples.length} Frames Sampled
        </span>
      </div>

      <div className={styles.chartWrapper}>
        <svg
          ref={svgReference}
          width={width}
          height={height}
          className={styles.timelineSvg}
          role="img"
          aria-label="Stacked performance timeline chart"
        />
      </div>

      <TimelineCategoryGrid metrics={currentMetrics} />
    </div>
  );
}
