import { describe, expect, it } from 'vitest';

import { forgeWebScriptDefaultPassingMode, isForgeWebScriptPodType } from './ast.ts';
import { parseForgeWebScript } from './parser.ts';
import { checkForgeWebScript } from './type-checker.ts';

describe('Forge Web Script safety contracts', () => {
  it('parses explicit mutability and reference modes', () => {
    const result = parseForgeWebScript(
      'export fn update(mut value: &mut Vector<i32>) -> &Vector<i32> { let mut next: i32 = 1; next = 2; return value; }',
      'mutability.fws',
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0].parameters[0]).toMatchObject({
      mutable: true,
      type: { reference: 'Vector', referenceMode: 'mut-ref' },
    });
    expect(result.module?.functions[0].result).toMatchObject({ reference: 'Vector', referenceMode: 'ref' });
  });

  it('classifies nested POD aggregates recursively and defaults handles to immutable references', () => {
    const result = parseForgeWebScript(
      'struct Point { x: i32; y: i32; } struct Wrapped { point: Point; } struct WithBytes { value: bytes; } export fn f(value: Wrapped) -> WithBytes { return value; }',
      'pod.fws',
    );
    expect(result.diagnostics).toEqual([]);
    const [point, wrapped, withBytes] = result.module!.structs;
    expect(isForgeWebScriptPodType(point.fields[0].type, result.module)).toBe(true);
    expect(isForgeWebScriptPodType({ ...wrapped.fields[0].type, reference: 'Point' }, result.module)).toBe(true);
    expect(isForgeWebScriptPodType(withBytes.fields[0].type, result.module)).toBe(false);
    expect(forgeWebScriptDefaultPassingMode(withBytes.fields[0].type, result.module)).toBe('immutable-reference');
  });

  it('rejects immutable mutation, conflicting mutable aliases, and region escapes', () => {
    const result = parseForgeWebScript(
      'fn mutate(value: &mut i32, other: &mut i32) -> unit { return; } export fn invalid(value: Vector<i32>) -> Vector<i32> { value[0] = 1; mutate(value, value); if true { let temporary: Vector<i32> = vector[1]; return temporary; } return value; }',
      'invalid-safety.fws',
    );
    expect(result.diagnostics).toEqual([]);
    const diagnostics = checkForgeWebScript(result.module!, 'invalid-safety.fws').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['FWS-SAFE-001', 'FWS-SAFE-003', 'FWS-SAFE-005', 'FWS-SAFE-006']),
    );
  });

  it('rejects non-identifier arguments for explicit reference parameters (FWS-SAFE-002)', () => {
    const result = parseForgeWebScript(
      'fn takes_ref(value: &Vector<i32>) -> unit { return; } export fn test() -> unit { takes_ref(vector[1]); return; }',
      'ref-args.fws',
    );
    expect(result.diagnostics).toEqual([]);
    const diagnostics = checkForgeWebScript(result.module!, 'ref-args.fws').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toContain('FWS-SAFE-002');
  });

  it('rejects region borrows crossing iterator suspension (FWS-SAFE-004)', () => {
    const result = parseForgeWebScript(
      'export iter fn test(items: Array<i32>) -> unit { let temporary: Vector<i32> = vector[1]; yield temporary; return; }',
      'iterator-suspension.fws',
    );
    expect(result.diagnostics).toEqual([]);
    const diagnostics = checkForgeWebScript(result.module!, 'iterator-suspension.fws').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toContain('FWS-SAFE-004');
  });

  it('rejects equivalent literal and local non-POD returns without ownership transfer (FWS-SAFE-006)', () => {
    // Both forms materialize a region-managed Vector in the callee without an
    // explicit owned/shared or promotion boundary, so both must be rejected.
    const literalResult = parseForgeWebScript(
      'export fn returnLiteral() -> Vector<i32> { return vector[1]; }',
      'literal-escape.fws',
    );
    expect(literalResult.diagnostics).toEqual([]);
    const literalDiagnostics = checkForgeWebScript(literalResult.module!, 'literal-escape.fws').diagnostics;
    expect(literalDiagnostics.map(({ code }) => code)).toContain('FWS-SAFE-006');

    const localResult = parseForgeWebScript(
      'export fn returnLocal() -> Vector<i32> { let temporary: Vector<i32> = vector[1]; return temporary; }',
      'local-escape.fws',
    );
    expect(localResult.diagnostics).toEqual([]);
    const localDiagnostics = checkForgeWebScript(localResult.module!, 'local-escape.fws').diagnostics;
    expect(localDiagnostics.map(({ code }) => code)).toContain('FWS-SAFE-006');
  });

  it('allows POD returns and explicitly owned/shared non-POD returns', () => {
    const podResult = parseForgeWebScript(
      'export fn returnPod() -> i32 { let temporary: i32 = 7; return temporary; } export fn returnPodLiteral() -> i32 { return 7; }',
      'pod-return.fws',
    );
    expect(podResult.diagnostics).toEqual([]);
    expect(checkForgeWebScript(podResult.module!, 'pod-return.fws').diagnostics.map(({ code }) => code)).not.toContain(
      'FWS-SAFE-006',
    );

    // Caller-owned parameters are already outside the callee region.
    const parameterResult = parseForgeWebScript(
      'export fn returnParameter(value: Vector<i32>) -> Vector<i32> { return value; }',
      'parameter-return.fws',
    );
    expect(parameterResult.diagnostics).toEqual([]);
    expect(
      checkForgeWebScript(parameterResult.module!, 'parameter-return.fws').diagnostics.map(({ code }) => code),
    ).not.toContain('FWS-SAFE-006');

    // Ownership is not yet surface syntax; prove the exemption on the AST contract.
    const ownedParsed = parseForgeWebScript(
      'export fn returnOwned() -> Vector<i32> { let temporary: Vector<i32> = vector[1]; return temporary; }',
      'owned-return.fws',
    );
    expect(ownedParsed.diagnostics).toEqual([]);
    const ownedModule = structuredClone(ownedParsed.module!);
    const ownedLet = ownedModule.functions[0].body[0];
    if (ownedLet.kind !== 'let') throw new Error('expected let');
    (ownedLet as { type: { ownership?: 'owned' } }).type = { ...ownedLet.type, ownership: 'owned' };
    expect(checkForgeWebScript(ownedModule, 'owned-return.fws').diagnostics.map(({ code }) => code)).not.toContain(
      'FWS-SAFE-006',
    );

    const sharedParsed = parseForgeWebScript(
      'export fn returnShared() -> Vector<i32> { let temporary: Vector<i32> = vector[1]; return temporary; }',
      'shared-return.fws',
    );
    expect(sharedParsed.diagnostics).toEqual([]);
    const sharedModule = structuredClone(sharedParsed.module!);
    const sharedLet = sharedModule.functions[0].body[0];
    if (sharedLet.kind !== 'let') throw new Error('expected let');
    (sharedLet as { type: { ownership?: 'shared' } }).type = { ...sharedLet.type, ownership: 'shared' };
    expect(checkForgeWebScript(sharedModule, 'shared-return.fws').diagnostics.map(({ code }) => code)).not.toContain(
      'FWS-SAFE-006',
    );
  });
});
