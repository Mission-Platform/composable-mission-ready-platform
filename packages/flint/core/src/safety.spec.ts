import { describe, expect, it } from 'vitest';

import { flintDefaultPassingMode, isFlintPodType } from './ast.ts';
import { parseFlint } from './parser.ts';
import { checkFlint } from './type-checker.ts';

describe('Forge Web Script safety contracts', () => {
  it('parses explicit mutability and reference modes', () => {
    const result = parseFlint(
      'export fn update(mut value: &mut Vector<i32>) -> &Vector<i32> { let mut next: i32 = 1; next = 2; return value; }',
      'mutability.flint',
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0].parameters[0]).toMatchObject({
      mutable: true,
      type: { reference: 'Vector', referenceMode: 'mut-ref' },
    });
    expect(result.module?.functions[0].result).toMatchObject({ reference: 'Vector', referenceMode: 'ref' });
  });

  it('classifies nested POD aggregates recursively and defaults handles to immutable references', () => {
    const result = parseFlint(
      'struct Point { x: i32; y: i32; } struct Wrapped { point: Point; } struct WithBytes { value: bytes; } export fn f(value: Wrapped) -> WithBytes { return value; }',
      'pod.flint',
    );
    expect(result.diagnostics).toEqual([]);
    const [point, wrapped, withBytes] = result.module!.structs;
    expect(isFlintPodType(point.fields[0].type, result.module)).toBe(true);
    expect(isFlintPodType({ ...wrapped.fields[0].type, reference: 'Point' }, result.module)).toBe(true);
    expect(isFlintPodType(withBytes.fields[0].type, result.module)).toBe(false);
    expect(flintDefaultPassingMode(withBytes.fields[0].type, result.module)).toBe('immutable-reference');
  });

  it('rejects immutable mutation, conflicting mutable aliases, and region escapes', () => {
    const result = parseFlint(
      'fn mutate(value: &mut i32, other: &mut i32) -> unit { return; } export fn invalid(value: Vector<i32>) -> Vector<i32> { value[0] = 1; mutate(value, value); if true { let temporary: Vector<i32> = vector[1]; return temporary; } return value; }',
      'invalid-safety.flint',
    );
    expect(result.diagnostics).toEqual([]);
    const diagnostics = checkFlint(result.module!, 'invalid-safety.flint').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['FLINT-SAFE-001', 'FLINT-SAFE-003', 'FLINT-SAFE-005', 'FLINT-SAFE-006']),
    );
  });

  it('rejects non-identifier arguments for explicit reference parameters (FLINT-SAFE-002)', () => {
    const result = parseFlint(
      'fn takes_ref(value: &Vector<i32>) -> unit { return; } export fn test() -> unit { takes_ref(vector[1]); return; }',
      'ref-args.flint',
    );
    expect(result.diagnostics).toEqual([]);
    const diagnostics = checkFlint(result.module!, 'ref-args.flint').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toContain('FLINT-SAFE-002');
  });

  it('rejects region borrows crossing iterator suspension (FLINT-SAFE-004)', () => {
    const result = parseFlint(
      'export iter fn test(items: Array<i32>) -> unit { let temporary: Vector<i32> = vector[1]; yield temporary; return; }',
      'iterator-suspension.flint',
    );
    expect(result.diagnostics).toEqual([]);
    const diagnostics = checkFlint(result.module!, 'iterator-suspension.flint').diagnostics;
    expect(diagnostics.map(({ code }) => code)).toContain('FLINT-SAFE-004');
  });

  it('rejects equivalent literal and local non-POD returns without ownership transfer (FLINT-SAFE-006)', () => {
    // Both forms materialize a region-managed Vector in the callee without an
    // explicit owned/shared or promotion boundary, so both must be rejected.
    const literalResult = parseFlint(
      'export fn returnLiteral() -> Vector<i32> { return vector[1]; }',
      'literal-escape.flint',
    );
    expect(literalResult.diagnostics).toEqual([]);
    const literalDiagnostics = checkFlint(literalResult.module!, 'literal-escape.flint').diagnostics;
    expect(literalDiagnostics.map(({ code }) => code)).toContain('FLINT-SAFE-006');

    const localResult = parseFlint(
      'export fn returnLocal() -> Vector<i32> { let temporary: Vector<i32> = vector[1]; return temporary; }',
      'local-escape.flint',
    );
    expect(localResult.diagnostics).toEqual([]);
    const localDiagnostics = checkFlint(localResult.module!, 'local-escape.flint').diagnostics;
    expect(localDiagnostics.map(({ code }) => code)).toContain('FLINT-SAFE-006');
  });

  it('allows POD returns and explicitly owned/shared non-POD returns', () => {
    const podResult = parseFlint(
      'export fn returnPod() -> i32 { let temporary: i32 = 7; return temporary; } export fn returnPodLiteral() -> i32 { return 7; }',
      'pod-return.flint',
    );
    expect(podResult.diagnostics).toEqual([]);
    expect(checkFlint(podResult.module!, 'pod-return.flint').diagnostics.map(({ code }) => code)).not.toContain(
      'FLINT-SAFE-006',
    );

    // Caller-owned parameters are already outside the callee region.
    const parameterResult = parseFlint(
      'export fn returnParameter(value: Vector<i32>) -> Vector<i32> { return value; }',
      'parameter-return.flint',
    );
    expect(parameterResult.diagnostics).toEqual([]);
    expect(
      checkFlint(parameterResult.module!, 'parameter-return.flint').diagnostics.map(({ code }) => code),
    ).not.toContain('FLINT-SAFE-006');

    // Ownership is not yet surface syntax; prove the exemption on the AST contract.
    const ownedParsed = parseFlint(
      'export fn returnOwned() -> Vector<i32> { let temporary: Vector<i32> = vector[1]; return temporary; }',
      'owned-return.flint',
    );
    expect(ownedParsed.diagnostics).toEqual([]);
    const ownedModule = structuredClone(ownedParsed.module!);
    const ownedLet = ownedModule.functions[0].body[0];
    if (ownedLet.kind !== 'let') throw new Error('expected let');
    (ownedLet as { type: { ownership?: 'owned' } }).type = { ...ownedLet.type, ownership: 'owned' };
    expect(checkFlint(ownedModule, 'owned-return.flint').diagnostics.map(({ code }) => code)).not.toContain(
      'FLINT-SAFE-006',
    );

    const sharedParsed = parseFlint(
      'export fn returnShared() -> Vector<i32> { let temporary: Vector<i32> = vector[1]; return temporary; }',
      'shared-return.flint',
    );
    expect(sharedParsed.diagnostics).toEqual([]);
    const sharedModule = structuredClone(sharedParsed.module!);
    const sharedLet = sharedModule.functions[0].body[0];
    if (sharedLet.kind !== 'let') throw new Error('expected let');
    (sharedLet as { type: { ownership?: 'shared' } }).type = { ...sharedLet.type, ownership: 'shared' };
    expect(checkFlint(sharedModule, 'shared-return.flint').diagnostics.map(({ code }) => code)).not.toContain(
      'FLINT-SAFE-006',
    );
  });
});
