import type { ForgeWebScriptLogger } from './logging.js';

export type ForgeWebScriptTrapCode =
  | 'CapabilityDenied'
  | 'HostError'
  | 'InvalidAbi'
  | 'InvalidOwnership'
  | 'MemoryExhausted'
  | 'MemoryOutOfBounds'
  | 'GuestTrap';

export interface ForgeWebScriptTrapOptions extends ErrorOptions {
  readonly logger?: ForgeWebScriptLogger;
}

export class ForgeWebScriptTrap extends Error {
  public readonly code: ForgeWebScriptTrapCode;
  public readonly capability?: string;

  public constructor(code: ForgeWebScriptTrapCode, message: string, capability?: string, options?: ForgeWebScriptTrapOptions) {
    super(message, options);
    this.name = 'ForgeWebScriptTrap';
    this.code = code;
    this.capability = capability;
    options?.logger?.error('trap', { code, capability, message });
  }
}

export function toForgeWebScriptHostError(error: unknown, capability: string, logger?: ForgeWebScriptLogger): ForgeWebScriptTrap {
  if (error instanceof ForgeWebScriptTrap) return error;
  const code = error instanceof Error && error.name.length > 0 ? error.name : 'HOST_ERROR';
  return new ForgeWebScriptTrap(
    'HostError',
    `Capability '${capability}' failed with host error '${code}'.`,
    capability,
    {
      cause: error,
      logger,
    },
  );
}
