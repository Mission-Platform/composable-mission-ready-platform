import fs from 'node:fs';
import path from 'node:path';

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface PngDiffOptions {
  baselinePath: string;
  candidatePath: string;
  diffPath: string;
  pixelThreshold?: number;
  maxMismatchRatio?: number;
}

export type PngDiffStatus = 'pass' | 'visual-mismatch' | 'dimension-mismatch';

export interface PngDiffResult {
  status: PngDiffStatus;
  width: number;
  height: number;
  mismatchPixels: number;
  mismatchRatio: number;
  diffPath?: string;
  message?: string;
}

function checkedThreshold(value: number | undefined, name: string, fallback: number): number {
  const threshold = value ?? fallback;
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)
    throw new Error(`${name} must be a finite number between 0 and 1.`);
  return threshold;
}

/** Compare two PNG files without padding or resampling either image. */
export function comparePngFiles(options: PngDiffOptions): PngDiffResult {
  const baseline = PNG.sync.read(fs.readFileSync(options.baselinePath));
  const candidate = PNG.sync.read(fs.readFileSync(options.candidatePath));
  const pixelThreshold = checkedThreshold(options.pixelThreshold, 'pixelThreshold', 0.1);
  const maxMismatchRatio = checkedThreshold(options.maxMismatchRatio, 'maxMismatchRatio', 0);

  if (baseline.width !== candidate.width || baseline.height !== candidate.height) {
    return {
      status: 'dimension-mismatch',
      width: baseline.width,
      height: baseline.height,
      mismatchPixels: 0,
      mismatchRatio: 1,
      message: `Image dimensions differ: baseline ${baseline.width}x${baseline.height}, candidate ${candidate.width}x${candidate.height}.`,
    };
  }

  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const mismatchPixels = pixelmatch(baseline.data, candidate.data, diff.data, baseline.width, baseline.height, {
    threshold: pixelThreshold,
  });
  const mismatchRatio = mismatchPixels / (baseline.width * baseline.height || 1);
  const status = mismatchRatio > maxMismatchRatio ? 'visual-mismatch' : 'pass';
  if (status === 'visual-mismatch') {
    fs.mkdirSync(path.dirname(options.diffPath), { recursive: true });
    fs.writeFileSync(options.diffPath, PNG.sync.write(diff));
  }
  return {
    status,
    width: baseline.width,
    height: baseline.height,
    mismatchPixels,
    mismatchRatio,
    ...(status === 'visual-mismatch' ? { diffPath: options.diffPath } : {}),
  };
}
