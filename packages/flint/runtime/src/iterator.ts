import type { FlintIteratorDescriptor } from './collections.js';

/**
 * Packed numeric representation of an iterator next call returned from WebAssembly.
 */
export type FlintPackedIteratorResult = number | bigint;

/**
 * Configuration options for constructing a WebAssembly iterator wrapper.
 */
export interface FlintWasmIteratorOptions<TValue> {
  readonly descriptor: FlintIteratorDescriptor;
  readonly valueDecoder?: (value: number) => TValue;
}

/**
 * JavaScript iterator and iterable bridge wrapping a WebAssembly iterator state handle.
 */
export interface FlintWasmIterator<TValue> extends Iterator<TValue>, Iterable<TValue> {
  readonly descriptor: FlintIteratorDescriptor;
}

/**
 * Unpacks a 64-bit integer into a 32-bit signed value and done boolean flag.
 *
 * @param value - Packed 64-bit numeric iterator return value.
 * @returns Object with unpacked value number and done boolean.
 */
function unpack(value: FlintPackedIteratorResult): { readonly value: number; readonly done: boolean } {
  const packed = typeof value === 'bigint' ? value : BigInt(value);
  return {
    value: Number(BigInt.asIntN(32, packed & 0xff_ff_ff_ffn)),
    done: packed >> 32n !== 0n,
  };
}

/** Adapts the backend's owned i32 handle and packed i64 next protocol to JS iteration. */
export function createFlintWasmIterator<TValue>(
  handle: number,
  next: (handle: number) => FlintPackedIteratorResult,
  options: FlintWasmIteratorOptions<TValue>,
): FlintWasmIterator<TValue> {
  let done = false;
  const valueDecoder = options.valueDecoder ?? ((value: number) => value as TValue);
  const iterator: FlintWasmIterator<TValue> = {
    descriptor: options.descriptor,
    next: () => {
      if (done) return { value: undefined as TValue, done: true };
      const result = unpack(next(handle));
      done = result.done;
      return { value: result.done ? (undefined as TValue) : valueDecoder(result.value), done: result.done };
    },
    [Symbol.iterator]: () => iterator,
  };
  return iterator;
}

/** Builds a JS-facing iterator factory from a backend factory and its `.next` export. */
export function createFlintWasmIteratorFactory<TValue, TArguments extends readonly unknown[]>(
  factory: (...arguments_: TArguments) => number,
  next: (handle: number) => FlintPackedIteratorResult,
  options: FlintWasmIteratorOptions<TValue>,
): (...arguments_: TArguments) => FlintWasmIterator<TValue> {
  return (...arguments_) => createFlintWasmIterator(factory(...arguments_), next, options);
}
