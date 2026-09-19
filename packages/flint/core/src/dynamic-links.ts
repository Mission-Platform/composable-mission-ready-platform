import { createDiagnostic, type FlintDiagnostic } from './diagnostics.js';

import type { FlintAbiFunction, FlintDynamicLinkMetadata } from './manifest.js';

export type FlintDynamicCallable = (...arguments_: readonly number[]) => unknown;

export interface FlintDynamicModule {
  readonly exports: Readonly<Record<string, FlintDynamicCallable>>;
  /** Signatures come from the module's ABI manifest, not from host capabilities. */
  readonly signatures?: Readonly<Record<string, string>>;
}

export interface FlintDynamicLinkIdentity {
  readonly artifactId: string;
  readonly manifestHash: string;
}

function signature(declaration: FlintAbiFunction): string {
  return `${declaration.parameters.map(({ type, reference, passing, referenceMode }) => `${type}:${reference ?? ''}:${passing ?? defaultPassing(type, reference)}:${referenceMode ?? ''}`).join(',')}->${declaration.result}:${declaration.resultReference ?? ''}:${declaration.resultPassing ?? defaultPassing(declaration.result, declaration.resultReference)}:${declaration.resultReferenceMode ?? ''}`;
}

function defaultPassing(type: string, reference: string | undefined): 'value' | 'immutable-reference' {
  return reference === undefined && type !== 'bytes' && type !== 'string' ? 'value' : 'immutable-reference';
}

function legacySignature(declaration: FlintAbiFunction): string {
  return `${declaration.parameters.map(({ type, reference }) => `${type}:${reference ?? ''}`).join(',')}->${declaration.result}:${declaration.resultReference ?? ''}`;
}

function identityKey(identity: FlintDynamicLinkIdentity, moduleId: string): string {
  return `${identity.artifactId}\0${identity.manifestHash}\0${moduleId}`;
}

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

  get diagnostics(): readonly FlintDiagnostic[] {
    return this._diagnostics;
  }

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

  async resolveExport(
    identity: FlintDynamicLinkIdentity,
    binding: FlintDynamicLinkMetadata['modules'][number],
    exportName: string,
    loader: () => FlintDynamicModule | Promise<FlintDynamicModule>,
  ): Promise<FlintDynamicCallable> {
    const module = await this.resolveModule(identity, binding.moduleId, loader);
    return this.validateExport(module, binding.moduleId, exportName, binding.exports);
  }

  resolveExportSync(
    identity: FlintDynamicLinkIdentity,
    binding: FlintDynamicLinkMetadata['modules'][number],
    exportName: string,
    loader: () => FlintDynamicModule,
  ): FlintDynamicCallable {
    const module = this.resolveModuleSync(identity, binding.moduleId, loader);
    return this.validateExport(module, binding.moduleId, exportName, binding.exports);
  }

  invalidate(identity: FlintDynamicLinkIdentity): void {
    const prefix = `${identity.artifactId}\0${identity.manifestHash}\0`;
    for (const key of this.modules.keys()) if (key.startsWith(prefix)) this.modules.delete(key);
    for (const key of this.pending.keys()) if (key.startsWith(prefix)) this.pending.delete(key);
  }

  clear(): void {
    this.modules.clear();
    this.pending.clear();
    this._diagnostics.length = 0;
  }

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
