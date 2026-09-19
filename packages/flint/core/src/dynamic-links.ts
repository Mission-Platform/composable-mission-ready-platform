import { createDiagnostic, type FlintDiagnostic } from './diagnostics.js';

import type { FlintAbiFunction, FlintDynamicLinkMetadata } from './manifest.js';

/**
 * Callable function signature for dynamic module exports accepting numeric handles/arguments.
 */
export type FlintDynamicCallable = (...arguments_: readonly number[]) => unknown;

/**
 * Dynamically linked module containing callable exports and optional ABI signatures.
 */
export interface FlintDynamicModule {
  readonly exports: Readonly<Record<string, FlintDynamicCallable>>;
  /** Signatures come from the module's ABI manifest, not from host capabilities. */
  readonly signatures?: Readonly<Record<string, string>>;
}

/**
 * Unique identity descriptor for a dynamic link artifact and manifest pair.
 */
export interface FlintDynamicLinkIdentity {
  readonly artifactId: string;
  readonly manifestHash: string;
}

/**
 * Computes the normalized canonical ABI type signature string for a function declaration.
 *
 * @param declaration - Function declaration metadata from the ABI manifest.
 * @returns Serialized signature string.
 */
function signature(declaration: FlintAbiFunction): string {
  return `${declaration.parameters.map(({ type, reference, passing, referenceMode }) => `${type}:${reference ?? ''}:${passing ?? defaultPassing(type, reference)}:${referenceMode ?? ''}`).join(',')}->${declaration.result}:${declaration.resultReference ?? ''}:${declaration.resultPassing ?? defaultPassing(declaration.result, declaration.resultReference)}:${declaration.resultReferenceMode ?? ''}`;
}

/**
 * Resolves the default parameter passing convention for a type and reference mode.
 *
 * @param type - Value type name.
 * @param reference - Reference mode or undefined.
 * @returns Default passing mode ('value' or 'immutable-reference').
 */
function defaultPassing(type: string, reference: string | undefined): 'value' | 'immutable-reference' {
  return reference === undefined && type !== 'bytes' && type !== 'string' ? 'value' : 'immutable-reference';
}

/**
 * Computes the legacy ABI type signature string without passing modes.
 *
 * @param declaration - Function declaration metadata from the ABI manifest.
 * @returns Legacy serialized signature string.
 */
function legacySignature(declaration: FlintAbiFunction): string {
  return `${declaration.parameters.map(({ type, reference }) => `${type}:${reference ?? ''}`).join(',')}->${declaration.result}:${declaration.resultReference ?? ''}`;
}

/**
 * Generates a cache key combining link identity and target module identifier.
 *
 * @param identity - Dynamic link identity descriptor.
 * @param moduleId - Target module identifier.
 * @returns Unique cache key string.
 */
function identityKey(identity: FlintDynamicLinkIdentity, moduleId: string): string {
  return `${identity.artifactId}\0${identity.manifestHash}\0${moduleId}`;
}

/**
 * Constructs an incompatible signature link diagnostic.
 *
 * @param moduleId - Target module identifier.
 * @param exportName - Name of the exported function.
 * @param expected - Expected ABI signature.
 * @param received - Actual received ABI signature, or undefined.
 * @returns Diagnostic describing the signature incompatibility.
 */
function diagnosticFor(
  moduleId: string,
  exportName: string,
  expected: string,
  received: string | undefined,
): FlintDiagnostic {
  return createDiagnostic(
    moduleId,
    'link',
    'FLINT-LINK-006',
    `Dynamic export '${exportName}' in module '${moduleId}' has an incompatible signature (expected ${expected}, received ${received ?? 'unknown'}).`,
    { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
    'error',
    'Rebuild the linked module with the ABI expected by the scanner artifact.',
  );
}

/**
 * Resolves dynamic source-module exports once per artifact and manifest.
 * Replacing either identity component invalidates the old callable handles.
 */
export class FlintDynamicLinkCache {
  private readonly modules = new Map<string, FlintDynamicModule>();
  private readonly pending = new Map<string, Promise<FlintDynamicModule>>();
  private readonly _diagnostics: FlintDiagnostic[] = [];

  /**
   * Diagnostic events recorded during export resolution and validation.
   */
  get diagnostics(): readonly FlintDiagnostic[] {
    return this._diagnostics;
  }

  /**
   * Asynchronously resolves and caches a dynamic module instance.
   *
   * @param identity - Artifact link identity.
   * @param moduleId - Identifier of the module to resolve.
   * @param loader - Factory returning the module or a promise of the module.
   * @returns Promise resolving to the loaded module.
   */
  async resolveModule(
    identity: FlintDynamicLinkIdentity,
    moduleId: string,
    loader: () => FlintDynamicModule | Promise<FlintDynamicModule>,
  ): Promise<FlintDynamicModule> {
    const key = identityKey(identity, moduleId);
    const cached = this.modules.get(key);
    if (cached !== undefined) return cached;
    let pending = this.pending.get(key);
    if (pending === undefined) {
      pending = Promise.resolve(loader()).then((module) => {
        this.modules.set(key, module);
        this.pending.delete(key);
        return module;
      });
      this.pending.set(key, pending);
    }
    return pending;
  }

  /**
   * Synchronously resolves and caches a dynamic module instance.
   *
   * @param identity - Artifact link identity.
   * @param moduleId - Identifier of the module to resolve.
   * @param loader - Factory returning the module synchronously.
   * @returns Loaded module instance.
   */
  resolveModuleSync(
    identity: FlintDynamicLinkIdentity,
    moduleId: string,
    loader: () => FlintDynamicModule,
  ): FlintDynamicModule {
    const key = identityKey(identity, moduleId);
    const cached = this.modules.get(key);
    if (cached !== undefined) return cached;
    const module = loader();
    this.modules.set(key, module);
    return module;
  }

  /**
   * Asynchronously resolves and validates an exported callable from a dynamic module.
   *
   * @param identity - Artifact link identity.
   * @param binding - Dynamic link metadata binding for the module.
   * @param exportName - Name of the export to resolve.
   * @param loader - Factory returning the module or a promise of the module.
   * @returns Promise resolving to the callable function.
   */
  async resolveExport(
    identity: FlintDynamicLinkIdentity,
    binding: FlintDynamicLinkMetadata['modules'][number],
    exportName: string,
    loader: () => FlintDynamicModule | Promise<FlintDynamicModule>,
  ): Promise<FlintDynamicCallable> {
    const module = await this.resolveModule(identity, binding.moduleId, loader);
    return this.validateExport(module, binding.moduleId, exportName, binding.exports);
  }

  /**
   * Synchronously resolves and validates an exported callable from a dynamic module.
   *
   * @param identity - Artifact link identity.
   * @param binding - Dynamic link metadata binding for the module.
   * @param exportName - Name of the export to resolve.
   * @param loader - Factory returning the module synchronously.
   * @returns Validated callable function.
   */
  resolveExportSync(
    identity: FlintDynamicLinkIdentity,
    binding: FlintDynamicLinkMetadata['modules'][number],
    exportName: string,
    loader: () => FlintDynamicModule,
  ): FlintDynamicCallable {
    const module = this.resolveModuleSync(identity, binding.moduleId, loader);
    return this.validateExport(module, binding.moduleId, exportName, binding.exports);
  }

  /**
   * Evicts cached modules and pending promises matching the provided link identity.
   *
   * @param identity - Link identity to invalidate.
   */
  invalidate(identity: FlintDynamicLinkIdentity): void {
    const prefix = `${identity.artifactId}\0${identity.manifestHash}\0`;
    for (const key of this.modules.keys()) if (key.startsWith(prefix)) this.modules.delete(key);
    for (const key of this.pending.keys()) if (key.startsWith(prefix)) this.pending.delete(key);
  }

  /**
   * Clears all cached modules, pending promises, and recorded diagnostics.
   */
  clear(): void {
    this.modules.clear();
    this.pending.clear();
    this._diagnostics.length = 0;
  }

  /**
   * Validates that an export exists on a module and matches expected ABI signature declarations.
   *
   * @param module - Dynamic module containing exports.
   * @param moduleId - Identifier of the module.
   * @param exportName - Name of the function export.
   * @param declarations - Expected ABI function declarations.
   * @returns The validated callable export.
   * @throws {Error} If the export is missing or has an incompatible signature.
   */
  private validateExport(
    module: FlintDynamicModule,
    moduleId: string,
    exportName: string,
    declarations: readonly FlintAbiFunction[],
  ): FlintDynamicCallable {
    const callable = module.exports[exportName];
    const declaration = declarations.find(({ name }) => name === exportName);
    if (callable === undefined || declaration === undefined) {
      throw new Error(`Dynamic export '${exportName}' is not present in module '${moduleId}'.`);
    }
    const expected = signature(declaration);
    const received = module.signatures?.[exportName];
    if (received !== undefined && received !== expected && received !== legacySignature(declaration)) {
      const diagnostic = diagnosticFor(moduleId, exportName, expected, received);
      this._diagnostics.push(diagnostic);
      throw new Error(diagnostic.message);
    }
    return callable;
  }
}
