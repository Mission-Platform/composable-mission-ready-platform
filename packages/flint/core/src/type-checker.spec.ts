import { describe, expect, it } from 'vitest';

import { parseFlint } from './parser.ts';
import { checkFlint } from './type-checker.ts';

function requireModule(parsed: ReturnType<typeof parseFlint>) {
  if (parsed.module === undefined) throw new Error('Expected parsed module to be defined');
  return parsed.module;
}

describe('Flint type checker hardening', () => {
  it('rejects foreign capability functions that shadow standard-library names with FLINT-ABI-005', () => {
    const source = `
      foreign "C" capability "libc" {
        fn malloc(size: c_size) -> CPtr<u8>;
      }

      export fn allocate(bytes: c_size) -> CPtr<u8> {
        return malloc(bytes);
      }
    `;

    const parsed = parseFlint(source, 'shadow-stdlib.flint');
    expect(parsed.diagnostics).toEqual([]);
    const result = checkFlint(requireModule(parsed), 'shadow-stdlib.flint');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'FLINT-ABI-005',
        message: expect.stringContaining("The name 'malloc' is reserved by the Forge standard library."),
      }),
    );
  });

  it('permits non-conflicting foreign capability function declarations', () => {
    const source = `
      foreign "C" capability "crypto" {
        fn custom_crypto_hash(input: CPtr<u8>, len: c_size) -> c_uint;
      }

      export fn hash(input: CPtr<u8>, len: c_size) -> c_uint {
        return custom_crypto_hash(input, len);
      }
    `;

    const parsed = parseFlint(source, 'valid-foreign.flint');
    expect(parsed.diagnostics).toEqual([]);
    const result = checkFlint(requireModule(parsed), 'valid-foreign.flint');
    expect(result.diagnostics).toEqual([]);
  });

  it('type-checks explicit references and mutable references without false-positive mismatches', () => {
    const source = `
      export fn test_refs(val: i32) -> i32 {
        let r: &i32 = &val;
        let mut x: i32 = 10;
        let mr: &mut i32 = &mut x;
        return *r + *mr;
      }
    `;

    const parsed = parseFlint(source, 'references.flint');
    expect(parsed.diagnostics).toEqual([]);
    const result = checkFlint(requireModule(parsed), 'references.flint');
    expect(result.diagnostics).toEqual([]);
  });

  it('infers correct pointee type when dereferencing CPtr and MutCPtr', () => {
    const source = `
      export fn test_cptr(ptr: CPtr<f64>, mutPtr: MutCPtr<i64>) -> f64 {
        let valF: f64 = *ptr;
        let valI: i64 = *mutPtr;
        return valF;
      }
    `;

    const parsed = parseFlint(source, 'cptr-deref.flint');
    expect(parsed.diagnostics).toEqual([]);
    const result = checkFlint(requireModule(parsed), 'cptr-deref.flint');
    expect(result.diagnostics).toEqual([]);
  });

  it('rejects dereferencing non-pointer scalar types with FLINT-TYPE-005', () => {
    const source = `
      export fn invalid_deref(count: i32) -> i32 {
        let value: i32 = *count;
        return value;
      }
    `;

    const parsed = parseFlint(source, 'invalid-deref.flint');
    expect(parsed.diagnostics).toEqual([]);
    const result = checkFlint(requireModule(parsed), 'invalid-deref.flint');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'FLINT-TYPE-005',
        message: expect.stringContaining("Cannot dereference non-pointer type 'i32'."),
      }),
    );
  });
});
