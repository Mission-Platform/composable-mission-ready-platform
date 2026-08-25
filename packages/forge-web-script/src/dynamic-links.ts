import { createDiagnostic, type ForgeWebScriptDiagnostic } from './diagnostics.js';

import type { ForgeWebScriptAbiFunction, ForgeWebScriptDynamicLinkMetadata } from './manifest.js';

export type ForgeWebScriptDynamicCallable = (...args: readonly number[]) => unknown;

export interface ForgeWebScriptDynamicModule {
  readonly exports: Readonly<Record<string, ForgeWebScriptDynamicCallable>>;
  /** Signatures come from the module's ABI manifest, not from host capabilities. */
  readonly signatures?: Readonly<Record<string, string>>;
}

export interface ForgeWebScriptDynamicLinkIdentity {
  readonly artifactId: string;
  readonly manifestHash: string;
}

function signature(declaration: ForgeWebScriptAbiFunction): string {
  const defaultPassing = (type: string, reference: string | undefined): 'value' | 'immutable-reference' =>
    reference === undefined && type !== 'bytes' && type !== 'string' ? 'value' : 'immutable-reference';
  return `${declaration.parameters.map(({ type, reference, passing, referenceMode }) => `${type}:${reference ?? ''}:${passing ?? defaultPassing(type, reference)}:${referenceMode ?? ''}`).join(',')}->${declaration.result}:${declaration.resultReference ?? ''}:${declaration.resultPassing ?? defaultPassing(declaration.result, declaration.resultReference)}:${declaration.resultReferenceMode ?? ''}`;
}

function legacySignature(declaration: ForgeWebScriptAbiFunction): string {
  return `${declaration.parameters.map(({ type, reference }) => `${type}:${reference ?? ''}`).join(',')}->${declaration.result}:${declaration.resultReference ?? ''}`;
}

function identityKey(identity: ForgeWebScriptDynamicLinkIdentity, moduleId: string): string {
  return `${identity.artifactId}\0${identity.manifestHash}\0${moduleId}`;
}

function diagnosticFor(
  moduleId: string,
  exportName: string,
  expected: string,
  received: string | undefined,
): ForgeWebScriptDiagnostic {
  return createDiagnostic(
    moduleId,
    'link',
    'FWS-LINK-006',
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
export class ForgeWebScriptDynamicLinkCache {
  private readonly modules = new Map<string, ForgeWebScriptDynamicModule>();
  private readonly pending = new Map<string, Promise<ForgeWebScriptDynamicModule>>();
  private readonly _diagnostics: ForgeWebScriptDiagnostic[] = [];

  get diagnostics(): readonly ForgeWebScriptDiagnostic[] {
    return this._diagnostics;
  }

  async resolveModule(
    identity: ForgeWebScriptDynamicLinkIdentity,
    moduleId: string,
    loader: () => ForgeWebScriptDynamicModule | Promise<ForgeWebScriptDynamicModule>,
  ): Promise<ForgeWebScriptDynamicModule> {
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
    identity: ForgeWebScriptDynamicLinkIdentity,
    moduleId: string,
    loader: () => ForgeWebScriptDynamicModule,
  ): ForgeWebScriptDynamicModule {
    const key = identityKey(identity, moduleId);
    const cached = this.modules.get(key);
    if (cached !== undefined) return cached;
    const module = loader();
    this.modules.set(key, module);
    return module;
  }

  async resolveExport(
    identity: ForgeWebScriptDynamicLinkIdentity,
    binding: ForgeWebScriptDynamicLinkMetadata['modules'][number],
    exportName: string,
    loader: () => ForgeWebScriptDynamicModule | Promise<ForgeWebScriptDynamicModule>,
  ): Promise<ForgeWebScriptDynamicCallable> {
    const module = await this.resolveModule(identity, binding.moduleId, loader);
    return this.validateExport(module, binding.moduleId, exportName, binding.exports);
  }

  resolveExportSync(
    identity: ForgeWebScriptDynamicLinkIdentity,
    binding: ForgeWebScriptDynamicLinkMetadata['modules'][number],
    exportName: string,
    loader: () => ForgeWebScriptDynamicModule,
  ): ForgeWebScriptDynamicCallable {
    const module = this.resolveModuleSync(identity, binding.moduleId, loader);
    return this.validateExport(module, binding.moduleId, exportName, binding.exports);
  }

  invalidate(identity: ForgeWebScriptDynamicLinkIdentity): void {
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
    module: ForgeWebScriptDynamicModule,
    moduleId: string,
    exportName: string,
    declarations: readonly ForgeWebScriptAbiFunction[],
  ): ForgeWebScriptDynamicCallable {
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
