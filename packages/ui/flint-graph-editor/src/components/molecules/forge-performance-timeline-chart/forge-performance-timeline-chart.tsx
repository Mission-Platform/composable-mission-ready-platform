import { useD3 } from '@mission-platform/d3';
import { scaleLinear } from 'd3';

import styles from './forge-performance-timeline-chart.module.scss';

import type { FlintPerformanceMetrics } from '../../../renderer/render-worker';
import type { MpElement } from '@mission-platform/forge-jsx';

export interface ForgePerformanceTimelineChartProperties {
  readonly history: readonly FlintPerformanceMetrics[];
  readonly currentMetrics: FlintPerformanceMetrics;
  readonly width?: number;
  readonly height?: number;
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

      const maxTime = Math.max(
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

      const xScale = scaleLinear()
        .domain([0, samples.length - 1])
        .range([0, innerWidth]);

      const yScale = scaleLinear()
        .domain([0, maxTime * 1.15])
        .range([innerHeight, 0]);

      const root = selection.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

      // 60 FPS (16.6ms) target line
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

      // 120 FPS (8.3ms) target line
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

      // Compute stacked layers
      const layers = [
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

      // Build stacked coordinates
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

      // Render stacked area paths
      for (const [layerIndex, layer] of layers.entries()) {
        const points = stackedPoints[layerIndex];
        if (!points || points.length === 0) continue;

        let areaD = '';
        // Top boundary
        for (const [pointIndex, point] of points.entries()) {
          const x = xScale(pointIndex);
          const y = yScale(point.y1);
          areaD += pointIndex === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
        }
        // Bottom boundary (reversed)
        for (let reverseIndex = points.length - 1; reverseIndex >= 0; reverseIndex--) {
          const point = points[reverseIndex];
          if (!point) continue;
          const x = xScale(reverseIndex);
          const y = yScale(point.y0);
          areaD += ` L ${x} ${y}`;
        }
        areaD += ' Z';

        root.append('path').attr('d', areaD).attr('fill', layer.color).attr('opacity', 0.25);

        // Top line stroke
        let lineD = '';
        for (const [pointIndex, point] of points.entries()) {
          const x = xScale(pointIndex);
          const y = yScale(point.y1);
          lineD += pointIndex === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
        }

        root.append('path').attr('d', lineD).attr('fill', 'none').attr('stroke', layer.color).attr('stroke-width', 1.5);
      }

      // Total frame time line
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

      // Latest point marker
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

      // X-Axis baseline
      root
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', innerHeight)
        .attr('y2', innerHeight)
        .attr('stroke', '#30363d')
        .attr('stroke-width', 1);

      // Y-Axis labels (0ms, half, max)
      const yTicks = [0, maxTime * 0.5, maxTime];
      for (const t of yTicks) {
        const y = yScale(t);
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
          .text(`${t.toFixed(0)}ms`);
      }
    },
    [history, currentMetrics, width, height],
  );

  const updatesValue = (currentMetrics.updateTimeMs ?? 0) + (currentMetrics.layoutTimeMs ?? 0);
  const spatialValue = currentMetrics.spatialIndexTimeMs ?? 0;
  const buffersValue = currentMetrics.bufferUploadTimeMs ?? 0;
  const textValue =
    currentMetrics.textPassTimeMs ?? (currentMetrics.renderTimeMs ? currentMetrics.renderTimeMs * 0.3 : 0.2);
  const drawValue =
    currentMetrics.drawPassTimeMs ?? (currentMetrics.renderTimeMs ? currentMetrics.renderTimeMs * 0.5 : 0.4);

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

      <div className={styles.categoryGrid}>
        <div className={styles.categoryCard}>
          <span className={styles.categoryLabel}>
            <span
              className={styles.categoryIndicator}
              style={{ backgroundColor: '#f0883e' }}
            />
            Updates & Layout
          </span>
          <span className={styles.categoryValue}>{updatesValue.toFixed(2)} ms</span>
        </div>
        <div className={styles.categoryCard}>
          <span className={styles.categoryLabel}>
            <span
              className={styles.categoryIndicator}
              style={{ backgroundColor: '#3fb950' }}
            />
            Spatial Indexing
          </span>
          <span className={styles.categoryValue}>{spatialValue.toFixed(2)} ms</span>
        </div>
        <div className={styles.categoryCard}>
          <span className={styles.categoryLabel}>
            <span
              className={styles.categoryIndicator}
              style={{ backgroundColor: '#a371f7' }}
            />
            Buffer Upload
          </span>
          <span className={styles.categoryValue}>{buffersValue.toFixed(2)} ms</span>
        </div>
        <div className={styles.categoryCard}>
          <span className={styles.categoryLabel}>
            <span
              className={styles.categoryIndicator}
              style={{ backgroundColor: '#39c5bb' }}
            />
            Text & SDF Pass
          </span>
          <span className={styles.categoryValue}>{textValue.toFixed(2)} ms</span>
        </div>
        <div className={styles.categoryCard}>
          <span className={styles.categoryLabel}>
            <span
              className={styles.categoryIndicator}
              style={{ backgroundColor: '#388bfd' }}
            />
            Draw Pass
          </span>
          <span className={styles.categoryValue}>{drawValue.toFixed(2)} ms</span>
        </div>
      </div>
    </div>
  );
}
