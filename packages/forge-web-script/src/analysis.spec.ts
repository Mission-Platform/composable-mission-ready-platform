import { describe, expect, it } from 'vitest';

import { createForgeWebScriptAnalysisContext } from './analysis/context.ts';
import { createForgeWebScriptAnalysisRuleRegistry } from './analysis/registry.ts';
import { compileForgeWebScript, createForgeWebScriptCompilerService } from './compiler.ts';
import { prepareForgeWebScriptFrontend } from './frontend.ts';

import type { ForgeWebScriptAnalysisFinding, ForgeWebScriptAnalysisRule } from './analysis/contracts.ts';

const source = 'export fn answer() -> i32 { return 42; }';
const span = { start: 0, end: 6, line: 1, column: 1, endLine: 1, endColumn: 7 } as const;

function rule(severity: 'error' | 'warning' = 'error'): ForgeWebScriptAnalysisRule {
  return {
    id: 'test.rule',
    category: 'security',
    analyze: (context): readonly ForgeWebScriptAnalysisFinding[] => [
      {
        code: 'FWS-ANALYSIS-SECURITY-001',
        ruleId: 'test.rule',
        category: 'security',
        severity,
        message: `Finding in ${context.fileName}`,
        fileName: context.fileName,
        span,
        evidence: [{ message: 'The test evidence', span, value: 'answer' }],
        hint: 'Fix the test finding.',
        owasp: ['A05'],
        cwe: ['CWE-693'],
      },
    ],
  };
}

describe('Forge Web Script analysis contracts', () => {
  it('reports conservative source safety findings with stable codes and evidence', () => {
    const artifact = compileForgeWebScript({
      source: `
export fn unsafe() -> i32 {
  let values: [i32; 2] = [1, 2];
  let overflow: i32 = 2147483647 + 1;
  let pointer: u32 = memory_alloc(4);
  memory_dealloc(pointer, 4);
  memory_load_u32(pointer);
  return values[2] + overflow;
}`,
      fileName: 'unsafe.fws',
      compilerVersion: '0.1.0',
    });

    expect(artifact.wasm).toBeUndefined();
    expect(artifact.analysis?.blockingFindings.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['FWS-ANALYSIS-MEMORY-002', 'FWS-ANALYSIS-MEMORY-005', 'FWS-ANALYSIS-OWNERSHIP-005']),
    );
    expect(artifact.diagnostics.find(({ code }) => code === 'FWS-ANALYSIS-MEMORY-002')).toMatchObject({
      phase: 'analysis',
      ruleId: 'fws.safety.ranges-and-bounds',
      cwe: ['CWE-129'],
    });
  });

  it('reports policy, taint, and deterministic resource violations', () => {
    const artifact = compileForgeWebScript({
      source: `
import capability "filesystem.read" as read(value: string) -> string;
export fn unsafe(input: string) -> string {
  while true { }
  return read(input);
}`,
      fileName: 'boundary.fws',
      compilerVersion: '0.1.0',
      requestedCapabilities: ['filesystem.read'],
      analysisPolicy: {
        profile: 'strict',
        allowedCapabilities: ['clock.now'],
      },
    });

    expect(artifact.wasm).toBeUndefined();
    expect(artifact.analysis?.blockingFindings.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'FWS-ANALYSIS-CONTROL-FLOW-002',
        'FWS-ANALYSIS-SECURITY-001',
        'FWS-ANALYSIS-SECURITY-002',
      ]),
    );
    expect(artifact.diagnostics.some(({ code }) => code === 'FWS-ABI-002')).toBe(false);
  });

  it('preserves valid bounded collection and allocator flows', () => {
    const artifact = compileForgeWebScript({
      source: `
export fn safe() -> i32 {
  let values: [i32; 2] = [1, 2];
  let pointer: u32 = memory_alloc(4);
  memory_dealloc(pointer, 4);
  return values[1];
}`,
      fileName: 'safe.fws',
      compilerVersion: '0.1.0',
    });

    expect(artifact.analysis?.blockingFindings).toEqual([]);
    expect(artifact.wasm).toBeInstanceOf(Uint8Array);
  });

  it('does not leak branch-local range facts into a sibling branch', () => {
    const artifact = compileForgeWebScript({
      source: `
export fn safe(flag: bool) -> i32 {
  let mut n: i32 = 0;
  let values: [i32; 2] = [1, 2];
  if flag { n = 100; return n; } else { return values[n]; }
}`,
      fileName: 'safe-branch-range.fws',
      compilerVersion: '0.1.0',
    });

    expect(artifact.analysis?.blockingFindings).toEqual([]);
    expect(artifact.wasm).toBeInstanceOf(Uint8Array);
  });

  it('does not treat mutually exclusive releases as a double release', () => {
    const artifact = compileForgeWebScript({
      source: `
export fn safe(flag: bool) -> i32 {
  let pointer: u32 = memory_alloc(4);
  if flag { memory_dealloc(pointer, 4); return 1; } else { memory_dealloc(pointer, 4); return 0; }
}`,
      fileName: 'safe-branch-ownership.fws',
      compilerVersion: '0.1.0',
    });

    expect(artifact.analysis?.blockingFindings).toEqual([]);
    expect(artifact.wasm).toBeInstanceOf(Uint8Array);
  });

  it('builds source-mapped facts and preserves evidence metadata', () => {
    const frontend = prepareForgeWebScriptFrontend({ source, fileName: 'answer.fws', compilerVersion: '0.1.0' });
    const context = createForgeWebScriptAnalysisContext(frontend, {
      sourceMap: [{ generated: span, original: span, sourceFile: 'answer.fws' }],
    });

    expect(context.sourceFiles[0]).toEqual({ fileName: 'answer.fws', source });
    expect(context.sourceMap?.[0].sourceFile).toBe('answer.fws');
    expect(context.facts.types).toEqual([{ functionName: 'answer', parameters: [], result: 'i32' }]);
    const report = createForgeWebScriptAnalysisRuleRegistry([rule()]).analyze(context);
    expect(report.findings).toHaveLength(1);
    expect(report.diagnostics[0]).toMatchObject({
      code: 'FWS-ANALYSIS-SECURITY-001',
      phase: 'analysis',
      evidence: [{ message: 'The test evidence' }],
      owasp: ['A05'],
      cwe: ['CWE-693'],
    });
  });

  it('deduplicates rules by id and findings by stable location', () => {
    const frontend = prepareForgeWebScriptFrontend({ source, fileName: 'answer.fws', compilerVersion: '0.1.0' });
    const context = createForgeWebScriptAnalysisContext(frontend);
    const report = createForgeWebScriptAnalysisRuleRegistry([rule(), rule()]).analyze(context);
    expect(report.findings).toHaveLength(1);
    expect(report.diagnostics).toHaveLength(1);
  });

  it('blocks strict output but reports non-blocking development findings', () => {
    const strict = compileForgeWebScript({
      source,
      fileName: 'answer.fws',
      compilerVersion: '0.1.0',
      analysisRules: [rule()],
    });
    expect(strict.wasm).toBeUndefined();
    expect(strict.analysis?.blockingFindings).toHaveLength(1);
    expect(strict.diagnostics[0].code).toBe('FWS-ANALYSIS-SECURITY-001');

    const development = compileForgeWebScript({
      source,
      fileName: 'answer.fws',
      compilerVersion: '0.1.0',
      analysis: { policy: { profile: 'development' }, rules: [rule()] },
    });
    expect(development.wasm).toBeInstanceOf(Uint8Array);
    expect(development.diagnostics[0].severity).toBe('error');
    expect(development.analysis?.blockingFindings).toEqual([]);
  });

  it('includes analysis policy and rules in service cache keys', () => {
    const service = createForgeWebScriptCompilerService();
    const input = { source, fileName: 'answer.fws', compilerVersion: '0.1.0', analysisRules: [rule('warning')] };
    service.compile(input);
    service.compile({
      ...input,
      analysisPolicy: {
        profile: 'development',
        allowedCapabilities: [],
        limits: {
          maxFindings: 2,
          maxCallDepth: 1,
          maxLoopIterations: 1,
          maxAllocationBytes: 1,
          maxAsyncTasks: 1,
          maxRegexInputLength: 1,
        },
        blockingSeverities: ['error'],
      },
    });
    expect(service.report()).toMatchObject({ cacheHits: 0, cacheMisses: 2 });
    service.dispose();
  });
});
