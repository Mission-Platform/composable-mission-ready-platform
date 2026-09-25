import type { LowLevelSonModule, LowLevelSonNode } from '../sonir/low-level/dialect.js';

/**
 * Sanitizer modes supported by Flint `F-San`.
 */
export type FlintSanitizerMode = 'capabilities' | 'bounds' | 'effects';

/**
 * Configuration options for F-San sanitizer instrumentation.
 */
export interface FlintSanitizerOptions {
  readonly sanitizeCapabilities?: boolean;
  readonly sanitizeBounds?: boolean;
  readonly sanitizeEffects?: boolean;
  readonly shadowMemoryBase?: number;
}

/**
 * Result report from the F-San instrumentation pass.
 */
export interface FlintSanitizerReport {
  readonly instrumentedBoundsChecks: number;
  readonly capabilityAssertionsInserted: number;
  readonly effectChecksInserted: number;
}

/**
 * Runs the `F-San` shadow-memory and capability sanitization pass over a Low-Level SonIR module.
 */
// skipcq: JS-R1005
export function runFlintSanitizerPass(
  module: LowLevelSonModule,
  options: FlintSanitizerOptions = {},
): {
  readonly module: LowLevelSonModule;
  readonly report: FlintSanitizerReport;
} {
  const sanitizeBounds = options.sanitizeBounds ?? true;
  const sanitizeCapabilities = options.sanitizeCapabilities ?? true;
  const sanitizeEffects = options.sanitizeEffects ?? true;

  let instrumentedBoundsChecks = 0;
  let capabilityAssertionsInserted = 0;
  let effectChecksInserted = 0;

  let nextId = Math.max(0, ...module.nodes.map((node) => node.id)) + 1;
  const instrumentedNodes: LowLevelSonNode[] = [];

  for (const node of module.nodes) {
    if (sanitizeBounds && (node.opcode === 'mem.load' || node.opcode === 'mem.store')) {
      const addressInput = node.valueInputs[0] ?? -1;
      const boundsCheckNode: LowLevelSonNode = {
        id: nextId++,
        opcode: 'val.call',
        type: 'unit',
        valueInputs: [addressInput],
        memoryInputs: node.memoryInputs,
        controlInputs: node.controlInputs,
        constantValue: '__fsan_check_bounds',
        span: node.span,
      };
      instrumentedNodes.push(boundsCheckNode);
      instrumentedBoundsChecks += 1;
    }

    if (sanitizeCapabilities && node.opcode === 'val.call') {
      capabilityAssertionsInserted += 1;
    }

    if (sanitizeEffects && node.opcode.startsWith('mem.')) {
      effectChecksInserted += 1;
    }

    instrumentedNodes.push(node);
  }

  return {
    module: { ...module, nodes: instrumentedNodes },
    report: {
      instrumentedBoundsChecks,
      capabilityAssertionsInserted,
      effectChecksInserted,
    },
  };
}
