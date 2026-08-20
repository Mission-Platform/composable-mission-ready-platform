import type { StorybookIndex } from '../runtime-validation/types.ts';

export const VISUAL_PARITY_RENDERERS = ['web-component', 'react', 'vue'] as const;
export type VisualParityRenderer = (typeof VISUAL_PARITY_RENDERERS)[number];

export const DEFAULT_VISUAL_PARITY_PORTS: Record<VisualParityRenderer, number> = {
  'web-component': 6200,
  react: 6201,
  vue: 6202,
};

export interface VisualParityRendererDefinition {
  framework: VisualParityRenderer;
  host: string;
  port: number;
  url: string;
  environment: { STORYBOOK_FRAMEWORK: VisualParityRenderer };
}

export interface RendererDefinitionOptions {
  host?: string;
  ports?: Partial<Record<VisualParityRenderer, number>>;
}

export interface VisualParityServerOptions extends RendererDefinitionOptions {
  timeoutMs?: number;
  cleanupGraceMs?: number;
}

export interface StorybookRendererServer {
  definition: VisualParityRendererDefinition;
  index: StorybookIndex;
  logPath: string;
  getOutput: () => string;
  close: () => Promise<void>;
}

export interface StorybookRendererServers {
  certificateOutput: string;
  servers: Record<VisualParityRenderer, StorybookRendererServer>;
  close: () => Promise<void>;
}

export interface VisualParityViewport {
  name: 'md';
  width: number;
  height: number;
  deviceScaleFactor: number;
}

export const DEFAULT_VISUAL_PARITY_VIEWPORT: VisualParityViewport = {
  name: 'md',
  width: 1024,
  height: 768,
  deviceScaleFactor: 1,
};

export type VisualParityCaptureStatus = 'pass' | 'runtime-failure' | 'blocked';
export type VisualParityDiagnosticKind =
  'console' | 'exception' | 'network' | 'page' | 'navigation' | 'readiness' | 'environment' | 'cleanup';

export interface VisualParityDiagnostic {
  kind: VisualParityDiagnosticKind;
  message: string;
}

export interface VisualParityCaptureRequest {
  storyId: string;
  renderer: VisualParityRenderer;
  baseUrl: string;
}

export interface VisualParityCaptureResult {
  storyId: string;
  renderer: VisualParityRenderer;
  url: string;
  status: VisualParityCaptureStatus;
  attempts: number;
  imagePath?: string;
  imageBytes?: number;
  diagnostics: VisualParityDiagnostic[];
  readiness?: {
    root: boolean;
    content: boolean;
    fontsReady: boolean;
    imagesPending: number;
    imageFailures: number;
    customElementsPending: string[];
    animationFrames: number;
    storyRenderComplete: boolean;
    phase?: string | null;
  };
  message?: string;
}

export interface VisualParityCaptureOptions {
  repositoryRoot: string;
  artifactDirectory: string;
  captures: VisualParityCaptureRequest[];
  viewport?: VisualParityViewport;
  theme?: 'light';
  taskName?: string;
  timeoutMs?: number;
  retries?: number;
  /** Parallel Ego Lite processes used across capture chunks. */
  workers?: number;
}

export interface VisualParityCaptureRun {
  results: VisualParityCaptureResult[];
  diagnostics: string[];
  cleanupErrors: string[];
}

export type VisualParityComparisonStatus = 'pass' | 'visual-mismatch' | 'runtime-failure' | 'missing-pair' | 'blocked';

export interface VisualParityComparison {
  baseline: 'web-component';
  candidate: 'react' | 'vue';
  status: VisualParityComparisonStatus;
  baselineUrl?: string;
  candidateUrl?: string;
  mismatchPixels?: number;
  mismatchRatio?: number;
  diffImage?: string;
  baselineImage?: string;
  candidateImage?: string;
  message?: string;
}

export interface VisualParityResult {
  storyId: string;
  packageName: string;
  sourceImport?: string;
  comparisons: VisualParityComparison[];
}

export interface VisualParityDiffOptions {
  pixelThreshold: number;
  maxMismatchRatio: number;
}

export interface VisualParityCliOptions extends VisualParityDiffOptions {
  repositoryRoot: string;
  packageName?: string;
  storyId?: string;
  maxStories?: number;
  ports: Partial<Record<VisualParityRenderer, number>>;
  viewport: VisualParityViewport;
  theme: 'light';
  workers: number;
  timeoutMs: number;
  outputDirectory: string;
}

export interface VisualParityReport {
  schemaVersion: 1;
  generatedAt: string;
  status: 'pass' | 'fail';
  options: Omit<VisualParityCliOptions, 'repositoryRoot' | 'outputDirectory'> & {
    repositoryRoot: string;
    outputDirectory: string;
  };
  renderers: Array<{
    framework: VisualParityRenderer;
    url: string;
    storybookFramework: VisualParityRenderer;
    serverLog?: string;
  }>;
  results: VisualParityResult[];
  captures: VisualParityCaptureResult[];
  diagnostics: string[];
  cleanupErrors: string[];
}

export function createRendererDefinitions(options: RendererDefinitionOptions = {}): VisualParityRendererDefinition[] {
  const host = options.host ?? '127.0.0.1';
  const ports = VISUAL_PARITY_RENDERERS.map(
    (framework) => options.ports?.[framework] ?? DEFAULT_VISUAL_PARITY_PORTS[framework],
  );
  if (new Set(ports).size !== ports.length) throw new Error('Visual parity renderer ports must be unique.');
  if (ports.some((port) => !Number.isInteger(port) || port < 1 || port > 65_535))
    throw new Error('Visual parity renderer ports must be valid TCP ports.');
  return VISUAL_PARITY_RENDERERS.map((framework, index) => {
    const port = ports[index];
    return {
      framework,
      host,
      port,
      url: `https://localhost:${port}`,
      environment: { STORYBOOK_FRAMEWORK: framework },
    };
  });
}
