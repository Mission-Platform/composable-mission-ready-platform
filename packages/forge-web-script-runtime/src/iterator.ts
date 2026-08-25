import type { ForgeWebScriptIteratorDescriptor } from './collections.js';

export type ForgeWebScriptPackedIteratorResult = number | bigint;

export interface ForgeWebScriptWasmIteratorOptions<TValue> {
  readonly descriptor: ForgeWebScriptIteratorDescriptor;
  readonly valueDecoder?: (value: number) => TValue;
}

export interface ForgeWebScriptWasmIterator<TValue> extends Iterator<TValue>, Iterable<TValue> {
  readonly descriptor: ForgeWebScriptIteratorDescriptor;
}

function unpack(value: ForgeWebScriptPackedIteratorResult): { readonly value: number; readonly done: boolean } {
  const packed = typeof value === 'bigint' ? value : BigInt(value);
  return {
    value: Number(BigInt.asIntN(32, packed & 0xffff_ffffn)),
    done: packed >> 32n !== 0n,
  };
}

/** Adapts the backend's owned i32 handle and packed i64 next protocol to JS iteration. */
export function createForgeWebScriptWasmIterator<TValue>(
  handle: number,
  next: (handle: number) => ForgeWebScriptPackedIteratorResult,
  options: ForgeWebScriptWasmIteratorOptions<TValue>,
): ForgeWebScriptWasmIterator<TValue> {
  let done = false;
  const valueDecoder = options.valueDecoder ?? ((value: number) => value as TValue);
  const iterator: ForgeWebScriptWasmIterator<TValue> = {
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
export function createForgeWebScriptWasmIteratorFactory<TValue, TArguments extends readonly unknown[]>(
  factory: (...arguments_: TArguments) => number,
  next: (handle: number) => ForgeWebScriptPackedIteratorResult,
  options: ForgeWebScriptWasmIteratorOptions<TValue>,
): (...arguments_: TArguments) => ForgeWebScriptWasmIterator<TValue> {
  return (...arguments_) => createForgeWebScriptWasmIterator(factory(...arguments_), next, options);
}
