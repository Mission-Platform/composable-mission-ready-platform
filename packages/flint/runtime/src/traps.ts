import type { FlintLogger } from './logging.js';
import type { FlintTraceReport } from './trace.js';

/**
 * Canonical runtime trap error category codes.
 */
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
  | 'DoubleRelease'
  | 'StackOverflow'
  | 'CallDepthExhausted';

/**
 * Options configuring runtime trap error reporting and logging.
 */
export interface FlintTrapOptions extends ErrorOptions {
  readonly logger?: FlintLogger;
}

/**
 * Represents a fatal runtime or guest execution trap in Flint.
 */
export class FlintTrap extends Error {
  public readonly code: FlintTrapCode;
  public readonly capability?: string;
  public trace?: FlintTraceReport;

  /**
   * Initializes a new FlintTrap error instance.
   *
   * @param code - Trap category code.
   * @param message - Descriptive failure message.
   * @param capability - Optional associated host capability identifier.
   * @param options - Error construction options including attached logger.
   */
  public constructor(code: FlintTrapCode, message: string, capability?: string, options?: FlintTrapOptions) {
    super(message, options);
    this.name = 'FlintTrap';
    this.code = code;
    this.capability = capability;
    options?.logger?.error('trap', { code, capability, message });
  }
}

/**
 * Associates an execution trace report with a Flint trap error if applicable.
 *
 * @param error - Candidate error object.
 * @param trace - Execution trace report to attach.
 */
export function attachFlintTrace(error: unknown, trace: FlintTraceReport): void {
  if (error instanceof FlintTrap) error.trace = trace;
}

/**
 * Converts an unknown host error into a normalized FlintTrap instance.
 *
 * @param error - Raw caught error.
 * @param capability - Target host capability identifier.
 * @param logger - Optional runtime logger for diagnostic telemetry.
 * @returns Normalized FlintTrap instance.
 */
export function toFlintHostError(error: unknown, capability: string, logger?: FlintLogger): FlintTrap {
  if (error instanceof FlintTrap) return error;
  const code = error instanceof Error && error.name.length > 0 ? error.name : 'HOST_ERROR';
  return new FlintTrap('HostError', `Capability '${capability}' failed with host error '${code}'.`, capability, {
    cause: error,
    logger,
  });
}
