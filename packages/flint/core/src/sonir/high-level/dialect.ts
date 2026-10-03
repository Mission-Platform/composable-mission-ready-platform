import type { FlintSourceSpan } from '../../diagnostics.js';

/**
 * High-Level SonIR dialect operation kinds preserving affine semantics and regional scopes.
 */
export type HighLevelSonOpcode =
  | 'affine.scope.begin'
  | 'affine.scope.end'
  | 'affine.borrow'
  | 'affine.transfer'
  | 'region.arena.create'
  | 'region.arena.destroy'
  | 'region.alloc'
  | 'collection.iter.create'
  | 'collection.iter.next'
  | 'struct.construct'
  | 'struct.extract';

/**
 * Node in the High-Level SonIR graph representation.
 */
export interface HighLevelSonNode {
  readonly id: number;
  readonly opcode: HighLevelSonOpcode;
  readonly type?: string;
  readonly inputs: readonly number[];
  readonly regionId: number;
  readonly ownershipMode?: 'owned' | 'borrowed' | 'shared';
  readonly span: FlintSourceSpan;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Region representation within High-Level SonIR.
 */
export interface HighLevelSonRegion {
  readonly id: number;
  readonly parentRegionId?: number;
  readonly kind: 'root' | 'affine-scope' | 'loop-region' | 'function-body';
}

/**
 * High-Level SonIR Module graph container.
 */
export interface HighLevelSonModule {
  readonly name: string;
  readonly regions: readonly HighLevelSonRegion[];
  readonly nodes: readonly HighLevelSonNode[];
  readonly entryRegionId: number;
}

/**
 * Creates an empty High-Level SonIR module graph.
 */
export function createHighLevelSonModule(name: string): HighLevelSonModule {
  return {
    name,
    regions: [{ id: 1, kind: 'root' }],
    nodes: [],
    entryRegionId: 1,
  };
}
