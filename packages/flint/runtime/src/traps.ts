import type { FlintLogger } from './logging.js';
import type { FlintTraceReport } from './trace.js';

export type FlintTrapCode =
  | 'CapabilityDenied'
  | 'HostError'
  | 'InvalidAbi'
  | 'InvalidOwnership'
  | 'MemoryExhausted'
  | 'MemoryOutOfBounds'
  | 'GuestTrap'
  | 'BorrowViolation'
  | 'RegionExpired'
  | 'UseAfterRelease'
  | 'DoubleRelease';

export interface FlintTrapOptions extends ErrorOptions {
  readonly logger?: FlintLogger;
}

export class FlintTrap extends Error {
  public readonly code: FlintTrapCode;
  public readonly capability?: string;
  public trace?: FlintTraceReport;

  public constructor(code: FlintTrapCode, message: string, capability?: string, options?: FlintTrapOptions) {
    super(message, options);
    this.name = 'FlintTrap';
    this.code = code;
    this.capability = capability;
    options?.logger?.error('trap', { code, capability, message });
  }
}

export function attachFlintTrace(error: unknown, trace: FlintTraceReport): void {
  if (error instanceof FlintTrap) error.trace = trace;
}

export function toFlintHostError(error: unknown, capability: string, logger?: FlintLogger): FlintTrap {
  if (error instanceof FlintTrap) return error;
  const code = error instanceof Error && error.name.length > 0 ? error.name : 'HOST_ERROR';
  return new FlintTrap('HostError', `Capability '${capability}' failed with host error '${code}'.`, capability, {
    cause: error,
    logger,
  });
}
