import fs from 'node:fs';
import path from 'node:path';

import { safeArtifactName } from '../runtime-validation/paths.ts';

import type { VisualParityCaptureResult, VisualParityComparison, VisualParityReport } from './types.ts';

export function storyArtifactDirectory(outputDirectory: string, storyId: string): string {
  return path.join(outputDirectory, 'stories', safeArtifactName(storyId));
}

export function writeStoryMetadata(
  outputDirectory: string,
  storyId: string,
  metadata: Record<string, unknown>,
): string {
  const target = path.join(storyArtifactDirectory(outputDirectory, storyId), 'source.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(metadata, undefined, 2)}\n`);
  return target;
}

export function writeCaptureDiagnostics(outputDirectory: string, result: VisualParityCaptureResult): string {
  const target = path.join(storyArtifactDirectory(outputDirectory, result.storyId), result.renderer, 'capture.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(result, undefined, 2)}\n`);
  return target;
}

export function writeComparisonDiagnostics(
  outputDirectory: string,
  storyId: string,
  comparison: VisualParityComparison,
): string {
  const target = path.join(
    storyArtifactDirectory(outputDirectory, storyId),
    `${comparison.baseline}-to-${comparison.candidate}.json`,
  );
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(comparison, undefined, 2)}\n`);
  return target;
}

export function writeVisualParityReport(outputDirectory: string, report: VisualParityReport): string {
  const target = path.join(outputDirectory, 'summary.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(report, undefined, 2)}\n`);
  return target;
}

export function reportHasFailures(report: VisualParityReport): boolean {
  return (
    report.status === 'fail' ||
    report.diagnostics.length > 0 ||
    report.cleanupErrors.length > 0 ||
    report.results.some((result) => result.comparisons.some((comparison) => comparison.status !== 'pass'))
  );
}
