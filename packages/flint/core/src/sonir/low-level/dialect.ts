import type { FlintSourceSpan } from '../../diagnostics.js';

/**
 * Low-Level SonIR opcodes representing scalar operations, control branches, and Memory SSA effects.
 */
export type LowLevelSonOpcode =
  | 'mem.phi'
  | 'mem.load'
  | 'mem.store'
  | 'mem.alloc'
  | 'mem.free'
  | 'ref.retain'
  | 'ref.release'
  | 'val.const'
  | 'val.add'
  | 'val.sub'
  | 'val.mul'
  | 'val.div'
  | 'val.shl'
  | 'val.shr_u'
  | 'val.shr_s'
  | 'val.cmp_eq'
  | 'val.cmp_ne'
  | 'val.cmp_lt_u'
  | 'val.cmp_lt_s'
  | 'val.cmp_gt_u'
  | 'val.cmp_gt_s'
  | 'val.cmp_le_u'
  | 'val.cmp_le_s'
  | 'val.cmp_ge_u'
  | 'val.cmp_ge_s'
  | 'val.select'
  | 'val.call'
  | 'val.simd.and'
  | 'val.simd.or'
  | 'val.simd.xor'
  | 'ctrl.start'
  | 'ctrl.branch'
  | 'ctrl.jump'
  | 'ctrl.suspend'
  | 'ctrl.barrier'
  | 'ctrl.return';

/**
 * Memory domain identifier (0 = guest private heap, 1 = host interop channel).
 */
export type MemoryDomain = 0 | 1;

/**
 * Explicit Memory SSA token tracking dependencies between memory-mutating operations.
 */
export interface MemorySsaToken {
  readonly version: number;
  readonly producerNodeId: number;
  readonly domain?: MemoryDomain;
}

/**
 * Node in the Low-Level Memory SSA SonIR graph.
 */
export interface LowLevelSonNode {
  readonly id: number;
  readonly opcode: LowLevelSonOpcode;
  readonly type?: string;
  readonly memoryDomain?: MemoryDomain;
  readonly valueInputs: readonly number[];
  readonly memoryInputs: readonly number[];
  readonly controlInputs: readonly number[];
  readonly constantValue?: number | boolean | string | bigint;
  readonly span: FlintSourceSpan;
}

/**
 * Low-Level SonIR Module graph.
 */
export interface LowLevelSonModule {
  readonly name: string;
  readonly nodes: readonly LowLevelSonNode[];
  readonly entryControlId: number;
  readonly initialMemoryToken: MemorySsaToken;
}

/**
 * Creates an initial Low-Level SonIR module graph with entry control and base memory token.
 */
export function createLowLevelSonModule(name: string): LowLevelSonModule {
  const dummySpan: FlintSourceSpan = {
    start: 0,
    end: 0,
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 1,
  };

  const startNode: LowLevelSonNode = {
    id: 1,
    opcode: 'ctrl.start',
    valueInputs: [],
    memoryInputs: [],
    controlInputs: [],
    span: dummySpan,
  };

  return {
    name,
    nodes: [startNode],
    entryControlId: 1,
    initialMemoryToken: { version: 0, producerNodeId: 1 },
  };
}
