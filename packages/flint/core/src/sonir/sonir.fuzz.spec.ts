import { describe, expect, it } from 'vitest';

import {
  buildThinLtoIndex,
  computeThinLtoInliningPlan,
  createModuleSummary,
  type ThinLtoFunctionSummary,
} from '../linker/thinlto.js';

import { createLowLevelSonModule, type LowLevelSonNode } from './low-level/dialect.js';
import { runDominatorGvnPass, runRedundantLoadEliminationPass, runSccpPass } from './passes/canonical.js';
import { applyDeclarativeRewrites, BUILTIN_REWRITE_RULES } from './rewrites/engine.js';

class FuzzPrng {
  private state: number;

  public constructor(seed = 0x88_77_66_55) {
    this.state = seed || 1;
  }

  public nextUint32(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  public nextFloat(): number {
    return this.nextUint32() / 0x1_00_00_00_00;
  }

  public nextInt(min: number, max: number): number {
    return min + Math.floor(this.nextFloat() * (max - min + 1));
  }

  public pick<T>(items: readonly T[]): T {
    return items[this.nextInt(0, items.length - 1)] as T;
  }
}

describe('SonIR Optimization & Declarative Rewrite Invariant Fuzzing (Target 3)', () => {
  const prng = new FuzzPrng(0xab_cd_ef_01);

  it('fuzzes declarative algebraic rewrites with randomized expression graphs and asserts idempotency', () => {
    const opcodes = ['val.add', 'val.sub', 'val.mul', 'val.and', 'val.or', 'val.xor'];

    for (let iteration = 0; iteration < 200; iteration += 1) {
      const nodes: LowLevelSonNode[] = [];
      const nodeCount = prng.nextInt(5, 30);

      // Node 0 is initial memory token
      // Generate some constants
      nodes.push(
        {
          id: 1,
          opcode: 'val.const',
          type: 'i32',
          constantValue: 0,
          valueInputs: [],
          memoryInputs: [],
          controlInputs: [],
          span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
        },
        {
          id: 2,
          opcode: 'val.const',
          type: 'i32',
          constantValue: 1,
          valueInputs: [],
          memoryInputs: [],
          controlInputs: [],
          span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
        },
      );

      for (let index = 3; index <= nodeCount; index += 1) {
        const isConst = prng.nextFloat() < 0.3;
        if (isConst) {
          nodes.push({
            id: index,
            opcode: 'val.const',
            type: 'i32',
            constantValue: prng.nextInt(-100, 100),
            valueInputs: [],
            memoryInputs: [],
            controlInputs: [],
            span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
          });
        } else {
          // Choose two existing value nodes
          const left = prng.nextInt(1, index - 1);
          const right = prng.nextInt(1, index - 1);
          const opcode = prng.pick(opcodes);

          nodes.push({
            id: index,
            opcode,
            type: 'i32',
            valueInputs: [left, right],
            memoryInputs: [],
            controlInputs: [],
            span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
          });
        }
      }

      // First rewrite pass
      const pass1 = applyDeclarativeRewrites(nodes, BUILTIN_REWRITE_RULES);
      expect(Array.isArray(pass1.nodes)).toBe(true);

      // Idempotency: second rewrite pass should not mutate further or crash
      const pass2 = applyDeclarativeRewrites(pass1.nodes, BUILTIN_REWRITE_RULES);
      expect(pass2.nodes.length).toBe(pass1.nodes.length);
      expect(pass2.appliedRules.length).toBe(0);
    }
  });

  it('fuzzes GVN and RLE optimization passes with randomly duplicated nodes and memory effects', () => {
    for (let iteration = 0; iteration < 100; iteration += 1) {
      const baseModule = createLowLevelSonModule(`fuzz_gvn_${iteration}`);
      const nodes: LowLevelSonNode[] = [...baseModule.nodes];

      // Add common subexpression targets
      for (let index = 2; index <= 20; index += 2) {
        nodes.push(
          {
            id: index,
            opcode: 'val.add',
            type: 'i32',
            valueInputs: [100, 200],
            memoryInputs: [],
            controlInputs: [],
            span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
          },
          {
            id: index + 1,
            opcode: 'val.add',
            type: 'i32',
            valueInputs: [100, 200], // duplicate
            memoryInputs: [],
            controlInputs: [],
            span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
          },
        );
      }

      const gvn = runDominatorGvnPass({ ...baseModule, nodes });
      expect(gvn.deduplicatedCount).toBeGreaterThanOrEqual(1);

      const rle = runRedundantLoadEliminationPass({ ...baseModule, nodes });
      expect(typeof rle.eliminatedCount).toBe('number');

      const sccp = runSccpPass({ ...baseModule, nodes });
      expect(typeof sccp.constantsPropagated).toBe('number');
    }
  });

  // skipcq: JS-R1005
  it('fuzzes ThinLTO indexer reachability invariants and devirtualization pruning across random module graphs', () => {
    const capabilities = ['fs.read', 'fs.write', 'net.socket', 'crypto.sha256', 'env.get'];

    for (let iteration = 0; iteration < 100; iteration += 1) {
      const moduleCount = prng.nextInt(2, 6);
      const modules = [];

      let functionId = 0;
      const allFunctionNames: string[] = [];

      for (let moduleIndex = 0; moduleIndex < moduleCount; moduleIndex += 1) {
        const functionCount = prng.nextInt(2, 8);
        const moduleFunctionNames: string[] = [];
        for (let f = 0; f < functionCount; f += 1) {
          const name = `fn_m${moduleIndex}_${functionId++}`;
          moduleFunctionNames.push(name);
          allFunctionNames.push(name);
        }

        const functions: ThinLtoFunctionSummary[] = [];
        for (const name of moduleFunctionNames) {
          const isExported = prng.nextFloat() < 0.3;
          const callCount = prng.nextInt(0, 3);
          const calls: string[] = [];
          for (let c = 0; c < callCount; c += 1) {
            if (allFunctionNames.length > 0) {
              calls.push(prng.pick(allFunctionNames));
            }
          }

          const capCount = prng.nextInt(0, 2);
          const capabilityImports: string[] = [];
          for (let cp = 0; cp < capCount; cp += 1) {
            capabilityImports.push(prng.pick(capabilities));
          }

          functions.push({
            name,
            isExported,
            calls,
            capabilityImports,
            instructionCount: prng.nextInt(5, 100),
            inlineCandidate: prng.nextFloat() < 0.5,
            memoryEffects: 'readwrite',
          });
        }

        modules.push(createModuleSummary(`module_${moduleIndex}`, functions));
      }

      const rootEntryPoints = modules.flatMap((module) => module.exportedSymbols);
      const index = buildThinLtoIndex(modules, rootEntryPoints);
      expect(index).toBeDefined();
      expect(index.liveSymbols).toBeInstanceOf(Set);
      expect(index.prunedCapabilities).toBeInstanceOf(Set);

      const inlinePlan = computeThinLtoInliningPlan(index, 30);
      expect(inlinePlan).toBeInstanceOf(Map);
    }
  });

  it('fuzzes SIMD rewrite rules (and self, or self, xor self)', () => {
    const nodes: LowLevelSonNode[] = [
      {
        id: 1,
        opcode: 'val.const',
        type: 'v128',
        constantValue: 0x12_34,
        valueInputs: [],
        memoryInputs: [],
        controlInputs: [],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      },
      {
        id: 2,
        opcode: 'val.simd.and',
        type: 'v128',
        valueInputs: [1, 1], // v & v -> v
        memoryInputs: [],
        controlInputs: [],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      },
      {
        id: 3,
        opcode: 'val.simd.or',
        type: 'v128',
        valueInputs: [1, 1], // v | v -> v
        memoryInputs: [],
        controlInputs: [],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      },
      {
        id: 4,
        opcode: 'val.simd.xor',
        type: 'v128',
        valueInputs: [1, 1], // v ^ v -> 0
        memoryInputs: [],
        controlInputs: [],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      },
    ];

    const result = applyDeclarativeRewrites(nodes, BUILTIN_REWRITE_RULES);
    expect(result.appliedRules).toContain('simd.and.self');
    expect(result.appliedRules).toContain('simd.or.self');
    expect(result.appliedRules).toContain('simd.xor.self');
  });

  it('fuzzes cycle detection on maliciously constructed cyclic SonIR graphs', () => {
    // Construct a cycle: node 1 -> node 2 -> node 3 -> node 1
    const dummySpan = { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 };
    const cyclicNodes: LowLevelSonNode[] = [
      {
        id: 1,
        opcode: 'val.add',
        type: 'i32',
        valueInputs: [3, 10],
        memoryInputs: [],
        controlInputs: [],
        span: dummySpan,
      },
      {
        id: 2,
        opcode: 'val.add',
        type: 'i32',
        valueInputs: [1, 10],
        memoryInputs: [],
        controlInputs: [],
        span: dummySpan,
      },
      {
        id: 3,
        opcode: 'val.add',
        type: 'i32',
        valueInputs: [2, 10],
        memoryInputs: [],
        controlInputs: [],
        span: dummySpan,
      },
    ];

    const cyclicModule: LowLevelSonModule = {
      name: 'cyclic_module',
      nodes: cyclicNodes,
      entryControlId: 1,
      initialMemoryToken: { version: 0, producerNodeId: 1 },
    };

    // Optimization passes should detect cycle gracefully and not hang or loop infinitely
    const gvn = runDominatorGvnPass(cyclicModule);
    expect(gvn.deduplicatedCount).toBe(0);

    const sccp = runSccpPass(cyclicModule);
    expect(sccp.constantsPropagated).toBe(0);

    const rle = runRedundantLoadEliminationPass(cyclicModule);
    expect(rle.eliminatedCount).toBe(0);
  });

  it('fuzzes ThinLTO dynamic dispatch tables and indirect call capability reachability invariants', () => {
    const modules = [
      createModuleSummary(
        'modA',
        [
          {
            name: 'main',
            isExported: true,
            calls: ['dispatch_fn'],
            capabilityImports: [],
            instructionCount: 10,
            inlineCandidate: false,
            memoryEffects: 'none',
          },
          {
            name: 'dispatch_fn',
            isExported: false,
            calls: [],
            indirectCalls: ['handler_1', 'handler_2'],
            capabilityImports: [],
            instructionCount: 15,
            inlineCandidate: false,
            memoryEffects: 'none',
          },
        ],
        ['handler_table_root'],
      ),
      createModuleSummary('modB', [
        {
          name: 'handler_1',
          isExported: false,
          calls: [],
          capabilityImports: ['capability:env/fs_read'],
          instructionCount: 20,
          inlineCandidate: false,
          memoryEffects: 'read',
        },
        {
          name: 'handler_2',
          isExported: false,
          calls: [],
          capabilityImports: ['capability:env/net_fetch'],
          instructionCount: 25,
          inlineCandidate: false,
          memoryEffects: 'readwrite',
        },
        {
          name: 'handler_table_root',
          isExported: false,
          calls: [],
          dispatchTableTargets: ['table_target'],
          capabilityImports: [],
          instructionCount: 5,
          inlineCandidate: false,
          memoryEffects: 'none',
        },
        {
          name: 'table_target',
          isExported: false,
          calls: [],
          capabilityImports: ['capability:crypto/rand'],
          instructionCount: 10,
          inlineCandidate: false,
          memoryEffects: 'none',
        },
        {
          name: 'dead_fn',
          isExported: false,
          calls: [],
          capabilityImports: ['capability:env/unused_exec'],
          instructionCount: 10,
          inlineCandidate: false,
          memoryEffects: 'none',
        },
      ]),
    ];

    const index = buildThinLtoIndex(modules, ['main']);

    // Handlers reachable via indirect calls or dynamic dispatch tables must be live
    expect(index.liveSymbols.has('handler_1')).toBe(true);
    expect(index.liveSymbols.has('handler_2')).toBe(true);
    expect(index.liveSymbols.has('table_target')).toBe(true);
    expect(index.liveSymbols.has('dead_fn')).toBe(false);

    // Capabilities needed by indirect call / table targets must NOT be pruned
    expect(index.prunedCapabilities.has('capability:env/fs_read')).toBe(false);
    expect(index.prunedCapabilities.has('capability:env/net_fetch')).toBe(false);
    expect(index.prunedCapabilities.has('capability:crypto/rand')).toBe(false);
    expect(index.prunedCapabilities.has('capability:env/unused_exec')).toBe(true);
  });

  it('fuzzes decision-tree match lowering strategy selection on dense vs sparse integer domains', async () => {
    const { isDenseSwitchEligible, selectMatchStrategy } = await import('../lowering/match-lowering.js');

    for (let index = 0; index < 500; index += 1) {
      const isDense = prng.nextFloat() < 0.5;

      if (isDense) {
        const count = prng.nextInt(4, 30);
        const start = prng.nextInt(0, 100);
        const denseValues = Array.from({ length: count }, (_, index_) => start + index_);

        expect(isDenseSwitchEligible(denseValues)).toBe(true);
        expect(selectMatchStrategy(denseValues)).toBe('br-table');
      } else {
        // Sparse values (e.g. 1, 1000, 50000, 1000000)
        const count = prng.nextInt(4, 15);
        const sparseValues = Array.from({ length: count }, () => prng.nextInt(1, 10_000_000));
        const uniqueValues = [...new Set(sparseValues)];

        if (uniqueValues.length >= 4) {
          const strategy = selectMatchStrategy(uniqueValues);
          expect(strategy === 'binary-search' || strategy === 'br-table').toBe(true);
        }
      }
    }
  });
});
