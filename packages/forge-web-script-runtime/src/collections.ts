export type ForgeWebScriptCollectionOwnership = 'owned' | 'borrowed' | 'shared';

/** Option-like value used by safe reads and empty iterator terminals. */
export interface ForgeWebScriptOption<TValue> {
  readonly kind: 'none' | 'some';
  readonly value?: TValue;
}

/** Result-like value used by non-trapping collection mutation helpers. */
export interface ForgeWebScriptResultValue<TValue, TError = string> {
  readonly kind: 'error' | 'ok';
  readonly value?: TValue;
  readonly error?: TError;
}

/**
 * Growable contiguous collection. Runtime-created vectors carry an owned handle
 * contract while borrowed/shared ownership is retained by derived values.
 */
export interface ForgeWebScriptVector<TValue> {
  readonly kind: 'vector';
  readonly values: readonly TValue[];
  /** Present on runtime-created vectors; legacy descriptors may derive it from values. */
  readonly length?: number;
  readonly capacity: number;
  readonly ownership: ForgeWebScriptCollectionOwnership;
}

/** Fixed-size contiguous collection; updates return a copied array value. */
export interface ForgeWebScriptArray<TValue> {
  readonly kind: 'array';
  readonly values: readonly TValue[];
  readonly length: number;
  readonly ownership: ForgeWebScriptCollectionOwnership;
}

/** One packed iterator pull result; done remains true after exhaustion. */
export interface ForgeWebScriptIteratorResult<TValue> {
  readonly done: boolean;
  readonly value?: TValue;
}

/** Lazy iterator view with descriptor capability and optional direct indexing. */
export interface ForgeWebScriptIterator<TValue> {
  readonly next: () => ForgeWebScriptIteratorResult<TValue>;
  readonly descriptor: ForgeWebScriptIteratorDescriptor;
  /** Number of source elements when known. This does not include consumed elements. */
  readonly length?: number;
  /** Non-consuming source-relative indexing, available for random-access iterators. */
  readonly at?: (index: number) => ForgeWebScriptOption<TValue>;
}

/** Any source accepted by serial and parallel iterator operations. */
export type ForgeWebScriptIterable<TValue> =
  ForgeWebScriptIterator<TValue> | ForgeWebScriptArray<TValue> | ForgeWebScriptVector<TValue> | Iterable<TValue>;

/** Linear consumption or non-consuming random access supported by an iterator. */
export type ForgeWebScriptIteratorCapability = 'linear' | 'random-access';

/** ABI metadata describing element representation, ownership, and access capability. */
export interface ForgeWebScriptIteratorDescriptor {
  readonly id: string;
  readonly elementType: string;
  readonly representation: 'descriptor-boundary';
  readonly ownership: ForgeWebScriptCollectionOwnership;
  /** Older descriptors default to linear for source compatibility. */
  readonly capability?: ForgeWebScriptIteratorCapability;
}

/** Create descriptor-boundary metadata; legacy callers default to linear access. */
export function createForgeWebScriptIteratorDescriptor(
  id: string,
  elementType = 'unknown',
  capability: ForgeWebScriptIteratorCapability = 'linear',
  ownership: ForgeWebScriptCollectionOwnership = 'owned',
): ForgeWebScriptIteratorDescriptor {
  return { id, elementType, representation: 'descriptor-boundary', ownership, capability };
}

function iteratorDescriptor(
  id: string,
  elementType: string,
  capability: ForgeWebScriptIteratorCapability = 'linear',
  ownership: ForgeWebScriptCollectionOwnership = 'owned',
): ForgeWebScriptIteratorDescriptor {
  return createForgeWebScriptIteratorDescriptor(id, elementType, capability, ownership);
}

/** Adapt an arbitrary iterable to a lazy linear Forge Web Script iterator. */
export function forgeWebScriptIteratorFromIterable<TValue>(
  values: Iterable<TValue>,
  elementType = 'unknown',
  id = 'iterable',
): ForgeWebScriptIterator<TValue> {
  return createForgeWebScriptIterator(values, iteratorDescriptor(id, elementType));
}

function isForgeWebScriptIterator<TValue>(
  value: ForgeWebScriptIterable<TValue>,
): value is ForgeWebScriptIterator<TValue> {
  return typeof value === 'object' && value !== null && 'next' in value && 'descriptor' in value;
}

function isForgeWebScriptArray<TValue>(value: ForgeWebScriptIterable<TValue>): value is ForgeWebScriptArray<TValue> {
  return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'array';
}

function isForgeWebScriptVector<TValue>(value: ForgeWebScriptIterable<TValue>): value is ForgeWebScriptVector<TValue> {
  return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'vector';
}

function asForgeWebScriptIterator<TValue>(value: ForgeWebScriptIterable<TValue>): ForgeWebScriptIterator<TValue> {
  if (isForgeWebScriptIterator(value)) return value;
  if (isForgeWebScriptArray(value)) return forgeWebScriptIteratorFromArray(value);
  if (isForgeWebScriptVector(value)) return forgeWebScriptIteratorFromVector(value);
  return forgeWebScriptIteratorFromIterable(value);
}

/** Lazily map values while retaining random access only when the source supports it. */
export function forgeWebScriptIteratorMap<TValue, TResult>(
  source: ForgeWebScriptIterator<TValue>,
  map: (value: TValue) => TResult,
  elementType = source.descriptor.elementType,
): ForgeWebScriptIterator<TResult> {
  return {
    next: () => {
      const result = source.next();
      return result.done ? { done: true } : { done: false, value: map(result.value as TValue) };
    },
    descriptor: iteratorDescriptor(
      `${source.descriptor.id}.map`,
      elementType,
      source.descriptor.capability ?? 'linear',
      source.descriptor.ownership,
    ),
    ...(source.descriptor.capability === 'random-access' && source.at !== undefined && source.length !== undefined
      ? {
          length: source.length,
          at: (index: number) => {
            const item = source.at?.(index) ?? forgeWebScriptNone<TValue>();
            return item.kind === 'none' ? forgeWebScriptNone<TResult>() : forgeWebScriptSome(map(item.value as TValue));
          },
        }
      : {}),
  };
}

/** Lazily filter values; filtering always downgrades capability to linear access. */
export function forgeWebScriptIteratorFilter<TValue>(
  source: ForgeWebScriptIterator<TValue>,
  predicate: (value: TValue) => boolean,
): ForgeWebScriptIterator<TValue> {
  return {
    next: () => {
      while (true) {
        const result = source.next();
        if (result.done) return { done: true };
        if (predicate(result.value as TValue)) return { done: false, value: result.value };
      }
    },
    descriptor: iteratorDescriptor(
      `${source.descriptor.id}.filter`,
      source.descriptor.elementType,
      'linear',
      source.descriptor.ownership,
    ),
  };
}

/** Lazily limit a source to at most count values. */
export function forgeWebScriptIteratorTake<TValue>(
  source: ForgeWebScriptIterator<TValue>,
  count: number,
): ForgeWebScriptIterator<TValue> {
  const limit = Math.max(0, Math.trunc(count));
  let remaining = limit;
  const descriptor = iteratorDescriptor(
    `${source.descriptor.id}.take`,
    source.descriptor.elementType,
    source.descriptor.capability ?? 'linear',
    source.descriptor.ownership,
  );
  return {
    next: () => {
      if (remaining === 0) return { done: true };
      remaining -= 1;
      return source.next();
    },
    descriptor,
    ...(descriptor.capability === 'random-access' && source.at !== undefined && source.length !== undefined
      ? {
          length: Math.min(limit, source.length),
          at: (index: number) =>
            validIndex(index, limit) ? (source.at?.(index) ?? forgeWebScriptNone<TValue>()) : forgeWebScriptNone(),
        }
      : {}),
  };
}

/** Lazily concatenates two sources without changing the order of either source. */
export function forgeWebScriptIteratorConcat<TValue>(
  first: ForgeWebScriptIterator<TValue>,
  second: ForgeWebScriptIterable<TValue>,
): ForgeWebScriptIterator<TValue> {
  const right = asForgeWebScriptIterator(second);
  let current: ForgeWebScriptIterator<TValue> = first;
  let usingSecond = false;
  return {
    next: () => {
      while (true) {
        const item = current.next();
        if (!item.done) return item;
        if (usingSecond) return { done: true };
        usingSecond = true;
        current = right;
      }
    },
    descriptor: iteratorDescriptor(
      `${first.descriptor.id}.add`,
      first.descriptor.elementType,
      'linear',
      first.descriptor.ownership,
    ),
  };
}

/** Lazily appends one value to an iterator. */
export function forgeWebScriptIteratorAdd<TValue>(
  source: ForgeWebScriptIterator<TValue>,
  value: TValue,
): ForgeWebScriptIterator<TValue> {
  let appended = false;
  return {
    next: () => {
      const item = source.next();
      if (!item.done) return item;
      if (appended) return { done: true };
      appended = true;
      return { done: false, value };
    },
    descriptor: iteratorDescriptor(
      `${source.descriptor.id}.add`,
      source.descriptor.elementType,
      'linear',
      source.descriptor.ownership,
    ),
  };
}

/** Lazily flatten nested sources in outer and inner source order. */
export function forgeWebScriptIteratorFlatten<TValue>(
  source: ForgeWebScriptIterator<ForgeWebScriptIterable<TValue>>,
): ForgeWebScriptIterator<TValue> {
  let nested: ForgeWebScriptIterator<TValue> | undefined;
  return {
    next: () => {
      while (true) {
        if (nested !== undefined) {
          const item = nested.next();
          if (!item.done) return item;
          nested = undefined;
        }
        const outer = source.next();
        if (outer.done) return { done: true };
        nested = asForgeWebScriptIterator(outer.value as ForgeWebScriptIterable<TValue>);
      }
    },
    descriptor: iteratorDescriptor(`${source.descriptor.id}.flatten`, 'unknown', 'linear', source.descriptor.ownership),
  };
}

export interface ForgeWebScriptHashStrategy<TValue> {
  readonly hash: (value: TValue) => number;
  readonly equals: (left: TValue, right: TValue) => boolean;
}

export interface ForgeWebScriptSet<TValue> {
  readonly kind: 'set';
  readonly buckets: readonly (readonly TValue[])[];
  readonly size: number;
  readonly capacity: number;
  readonly strategy: ForgeWebScriptHashStrategy<TValue>;
  readonly ownership: ForgeWebScriptCollectionOwnership;
}

export interface ForgeWebScriptMapEntry<TKey, TValue> {
  readonly key: TKey;
  readonly value: TValue;
}

export interface ForgeWebScriptMap<TKey, TValue> {
  readonly kind: 'map';
  readonly buckets: readonly (readonly ForgeWebScriptMapEntry<TKey, TValue>[])[];
  readonly size: number;
  readonly capacity: number;
  readonly strategy: ForgeWebScriptHashStrategy<TKey>;
  readonly ownership: ForgeWebScriptCollectionOwnership;
}

/** Construct an empty Option value. */
export const forgeWebScriptNone = <TValue>(): ForgeWebScriptOption<TValue> => ({ kind: 'none' });

/** Construct a present Option value. */
export const forgeWebScriptSome = <TValue>(value: TValue): ForgeWebScriptOption<TValue> => ({ kind: 'some', value });

/** Construct a successful Result value. */
export const forgeWebScriptOk = <TValue, TError = string>(
  value: TValue,
): ForgeWebScriptResultValue<TValue, TError> => ({
  kind: 'ok',
  value,
});

/** Construct an error Result value without throwing. */
export const forgeWebScriptError = <TValue, TError = string>(
  error: TError,
): ForgeWebScriptResultValue<TValue, TError> => ({
  kind: 'error',
  error,
});

/** Create an owned vector by copying the supplied values. */
export function createForgeWebScriptVector<TValue>(
  values: readonly TValue[] = [],
  ownership: ForgeWebScriptCollectionOwnership = 'owned',
): ForgeWebScriptVector<TValue> {
  const copied = [...values];
  return { kind: 'vector', values: copied, length: copied.length, capacity: Math.max(4, copied.length), ownership };
}

/** Create a fixed array by copying the supplied values. */
export function createForgeWebScriptArray<TValue>(
  values: readonly TValue[] = [],
  ownership: ForgeWebScriptCollectionOwnership = 'owned',
): ForgeWebScriptArray<TValue> {
  const copied = [...values];
  return { kind: 'array', values: copied, length: copied.length, ownership };
}

function validIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length;
}

function vectorLength<TValue>(vector: ForgeWebScriptVector<TValue>): number {
  return vector.length ?? vector.values.length;
}

function requireIndex(index: number, length: number, collection: string): void {
  if (!validIndex(index, length))
    throw new RangeError(`${collection} index ${index} is out of bounds for length ${length}`);
}

/** Return an array length without consuming or copying its elements. */
export function forgeWebScriptArrayLength<TValue>(array: ForgeWebScriptArray<TValue>): number {
  return array.length;
}

/** Read an array element; invalid indices return Option.none. */
export function forgeWebScriptArrayGet<TValue>(
  array: ForgeWebScriptArray<TValue>,
  index: number,
): ForgeWebScriptOption<TValue> {
  return validIndex(index, array.length) ? forgeWebScriptSome(array.values[index] as TValue) : forgeWebScriptNone();
}

/** Replace an array element; invalid indices throw RangeError. */
export function forgeWebScriptArraySet<TValue>(
  array: ForgeWebScriptArray<TValue>,
  index: number,
  value: TValue,
): ForgeWebScriptArray<TValue> {
  requireIndex(index, array.length, 'array');
  const values = [...array.values];
  values[index] = value;
  return { ...array, values };
}

/** Replace an array element without throwing; invalid indices return an error result. */
export function forgeWebScriptArrayTrySet<TValue>(
  array: ForgeWebScriptArray<TValue>,
  index: number,
  value: TValue,
): ForgeWebScriptResultValue<ForgeWebScriptArray<TValue>> {
  return validIndex(index, array.length)
    ? forgeWebScriptOk(forgeWebScriptArraySet(array, index, value))
    : forgeWebScriptError(`array index ${index} is out of bounds`);
}

/** Append a value and grow capacity as needed, preserving ownership. */
export function forgeWebScriptVectorPush<TValue>(
  vector: ForgeWebScriptVector<TValue>,
  value: TValue,
): ForgeWebScriptVector<TValue> {
  const values = [...vector.values, value];
  return {
    ...vector,
    values,
    length: values.length,
    capacity: values.length > vector.capacity ? Math.max(1, vector.capacity * 2) : vector.capacity,
  };
}

/** Alias for vector push, matching the stdlib iterator `add` vocabulary. */
export const forgeWebScriptVectorAdd = forgeWebScriptVectorPush;

/** Remove the final vector value and return the updated vector plus Option result. */
export function forgeWebScriptVectorPop<TValue>(vector: ForgeWebScriptVector<TValue>): {
  readonly vector: ForgeWebScriptVector<TValue>;
  readonly value: ForgeWebScriptOption<TValue>;
} {
  if (vector.values.length === 0) return { vector, value: forgeWebScriptNone() };
  const values = vector.values.slice(0, -1);
  return {
    vector: { ...vector, values, length: values.length },
    value: forgeWebScriptSome(vector.values.at(-1) as TValue),
  };
}

/** Read a vector element; invalid indices return Option.none. */
export function forgeWebScriptVectorGet<TValue>(
  vector: ForgeWebScriptVector<TValue>,
  index: number,
): ForgeWebScriptOption<TValue> {
  return validIndex(index, vectorLength(vector))
    ? forgeWebScriptSome(vector.values[index] as TValue)
    : forgeWebScriptNone();
}

/** Return the number of initialized vector elements. */
export function forgeWebScriptVectorLength<TValue>(vector: ForgeWebScriptVector<TValue>): number {
  return vectorLength(vector);
}

/** Replace a vector element; invalid indices throw RangeError. */
export function forgeWebScriptVectorSet<TValue>(
  vector: ForgeWebScriptVector<TValue>,
  index: number,
  value: TValue,
): ForgeWebScriptVector<TValue> {
  requireIndex(index, vectorLength(vector), 'vector');
  const values = [...vector.values];
  values[index] = value;
  return { ...vector, values };
}

/** Replace a vector element without throwing; invalid indices return an error result. */
export function forgeWebScriptVectorTrySet<TValue>(
  vector: ForgeWebScriptVector<TValue>,
  index: number,
  value: TValue,
): ForgeWebScriptResultValue<ForgeWebScriptVector<TValue>> {
  return validIndex(index, vectorLength(vector))
    ? forgeWebScriptOk(forgeWebScriptVectorSet(vector, index, value))
    : forgeWebScriptError(`vector index ${index} is out of bounds`);
}

/** Eagerly map a vector into a new vector in source index order. */
export function forgeWebScriptVectorMap<TValue, TResult>(
  vector: ForgeWebScriptVector<TValue>,
  transform: (value: TValue, index: number) => TResult,
): ForgeWebScriptVector<TResult> {
  const values: TResult[] = [];
  for (const [index, value] of vector.values.entries()) values.push(transform(value, index));
  return createForgeWebScriptVector(values, vector.ownership);
}

/** Eagerly filter a vector into a new vector while preserving source order. */
export function forgeWebScriptVectorFilter<TValue>(
  vector: ForgeWebScriptVector<TValue>,
  predicate: (value: TValue, index: number) => boolean,
): ForgeWebScriptVector<TValue> {
  const values: TValue[] = [];
  for (const [index, value] of vector.values.entries()) if (predicate(value, index)) values.push(value);
  return createForgeWebScriptVector(values, vector.ownership);
}

/** Fold vector values left-to-right, including the supplied initial accumulator. */
export function forgeWebScriptVectorFold<TValue, TResult>(
  vector: ForgeWebScriptVector<TValue>,
  initial: TResult,
  reducer: (accumulator: TResult, value: TValue, index: number) => TResult,
): TResult {
  let result = initial;
  for (const [index, value] of vector.values.entries()) result = reducer(result, value, index);
  return result;
}

/** Adapt an iterable to a lazy iterator with the supplied ABI descriptor. */
export function createForgeWebScriptIterator<TValue>(
  values: Iterable<TValue>,
  descriptor: ForgeWebScriptIteratorDescriptor,
): ForgeWebScriptIterator<TValue> {
  const iterator = values[Symbol.iterator]();
  let exhausted = false;
  return {
    descriptor,
    next: () => {
      if (exhausted) return { done: true };
      const result = iterator.next();
      exhausted = result.done === true;
      return result.done === true ? { done: true } : { done: false, value: result.value };
    },
  };
}

/** Create a random-access iterator over a vector without changing its ownership. */
export function forgeWebScriptIteratorFromVector<TValue>(
  vector: ForgeWebScriptVector<TValue>,
  descriptor: ForgeWebScriptIteratorDescriptor = iteratorDescriptor(
    'vector',
    'unknown',
    'random-access',
    vector.ownership,
  ),
): ForgeWebScriptIterator<TValue> {
  return forgeWebScriptIteratorFromIndexedValues(vector.values, withRandomAccessCapability(descriptor));
}

/** Create a random-access iterator over a fixed array without changing its ownership. */
export function forgeWebScriptIteratorFromArray<TValue>(
  array: ForgeWebScriptArray<TValue>,
  descriptor: ForgeWebScriptIteratorDescriptor = iteratorDescriptor(
    'array',
    'unknown',
    'random-access',
    array.ownership,
  ),
): ForgeWebScriptIterator<TValue> {
  return forgeWebScriptIteratorFromIndexedValues(array.values, withRandomAccessCapability(descriptor));
}

function withRandomAccessCapability(descriptor: ForgeWebScriptIteratorDescriptor): ForgeWebScriptIteratorDescriptor {
  return descriptor.capability === undefined ? { ...descriptor, capability: 'random-access' } : descriptor;
}

function forgeWebScriptIteratorFromIndexedValues<TValue>(
  values: readonly TValue[],
  descriptor: ForgeWebScriptIteratorDescriptor,
): ForgeWebScriptIterator<TValue> {
  const iterator = values[Symbol.iterator]();
  let exhausted = false;
  const randomAccess = descriptor.capability === 'random-access';
  return {
    descriptor,
    length: values.length,
    at: randomAccess
      ? (index) =>
          validIndex(index, values.length) ? forgeWebScriptSome(values[index] as TValue) : forgeWebScriptNone()
      : undefined,
    next: () => {
      if (exhausted) return { done: true };
      const result = iterator.next();
      exhausted = result.done === true;
      return result.done === true ? { done: true } : { done: false, value: result.value };
    },
  };
}

export function forgeWebScriptIteratorCollect<TValue>(
  iterator: ForgeWebScriptIterator<TValue>,
): ForgeWebScriptVector<TValue> {
  const values: TValue[] = [];
  let item = iterator.next();
  while (!item.done) {
    values.push(item.value as TValue);
    item = iterator.next();
  }
  return createForgeWebScriptVector(values);
}

export function forgeWebScriptIteratorFirst<TValue>(
  iterator: ForgeWebScriptIterator<TValue>,
): ForgeWebScriptOption<TValue> {
  const item = iterator.next();
  return item.done ? forgeWebScriptNone() : forgeWebScriptSome(item.value as TValue);
}

export function forgeWebScriptIteratorLast<TValue>(
  iterator: ForgeWebScriptIterator<TValue>,
): ForgeWebScriptOption<TValue> {
  if (
    iterator.descriptor.capability === 'random-access' &&
    iterator.at !== undefined &&
    iterator.length !== undefined
  ) {
    return iterator.length === 0 ? forgeWebScriptNone() : iterator.at(iterator.length - 1);
  }
  let last = forgeWebScriptNone<TValue>();
  let item = iterator.next();
  while (!item.done) {
    last = forgeWebScriptSome(item.value as TValue);
    item = iterator.next();
  }
  return last;
}

export function forgeWebScriptIteratorAt<TValue>(
  iterator: ForgeWebScriptIterator<TValue>,
  index: number,
): ForgeWebScriptOption<TValue> {
  if (!Number.isInteger(index) || index < 0) return forgeWebScriptNone();
  if (iterator.descriptor.capability === 'random-access' && iterator.at !== undefined) return iterator.at(index);
  let current = 0;
  let item = iterator.next();
  while (!item.done) {
    if (current === index) return forgeWebScriptSome(item.value as TValue);
    current += 1;
    item = iterator.next();
  }
  return forgeWebScriptNone();
}

export function forgeWebScriptIteratorFold<TValue, TResult>(
  iterator: ForgeWebScriptIterator<TValue>,
  initial: TResult,
  reducer: (accumulator: TResult, value: TValue, index: number) => TResult,
): TResult {
  let result = initial;
  let index = 0;
  let item = iterator.next();
  while (!item.done) {
    result = reducer(result, item.value as TValue, index);
    index += 1;
    item = iterator.next();
  }
  return result;
}

export function forgeWebScriptIteratorToArray<TValue>(
  iterator: ForgeWebScriptIterator<TValue>,
  ownership: ForgeWebScriptCollectionOwnership = 'owned',
): ForgeWebScriptArray<TValue> {
  return createForgeWebScriptArray(forgeWebScriptIteratorCollect(iterator).values, ownership);
}

const bucketIndex = (hash: number, capacity: number): number => {
  const normalized = Math.abs(Math.trunc(hash));
  return normalized % capacity;
};

function resizeBuckets<TValue>(
  buckets: readonly (readonly TValue[])[],
  capacity: number,
  hash: (value: TValue) => number,
): readonly (readonly TValue[])[] {
  const resized = Array.from({ length: capacity }, () => [] as TValue[]);
  for (const bucket of buckets) for (const value of bucket) resized[bucketIndex(hash(value), capacity)]?.push(value);
  return resized;
}

export function createForgeWebScriptSet<TValue>(
  values: readonly TValue[] = [],
  strategy: ForgeWebScriptHashStrategy<TValue> = forgeWebScriptDefaultHashStrategy<TValue>(),
): ForgeWebScriptSet<TValue> {
  let result: ForgeWebScriptSet<TValue> = {
    kind: 'set',
    buckets: Array.from({ length: 4 }, () => []),
    size: 0,
    capacity: 4,
    strategy,
    ownership: 'owned',
  };
  for (const value of values) result = forgeWebScriptSetAdd(result, value);
  return result;
}

export function forgeWebScriptSetHas<TValue>(set: ForgeWebScriptSet<TValue>, value: TValue): boolean {
  return (set.buckets[bucketIndex(set.strategy.hash(value), set.capacity)] ?? []).some((candidate) =>
    set.strategy.equals(candidate, value),
  );
}

export function forgeWebScriptSetAdd<TValue>(set: ForgeWebScriptSet<TValue>, value: TValue): ForgeWebScriptSet<TValue> {
  if (forgeWebScriptSetHas(set, value)) return set;
  const capacity = set.size + 1 > (set.capacity * 3) / 4 ? set.capacity * 2 : set.capacity;
  const buckets = (
    capacity === set.capacity
      ? set.buckets.map((bucket) => [...bucket])
      : resizeBuckets(set.buckets, capacity, set.strategy.hash)
  ) as TValue[][];
  buckets[bucketIndex(set.strategy.hash(value), capacity)]?.push(value);
  return { ...set, buckets, capacity, size: set.size + 1 };
}

export function forgeWebScriptSetDelete<TValue>(
  set: ForgeWebScriptSet<TValue>,
  value: TValue,
): ForgeWebScriptSet<TValue> {
  if (!forgeWebScriptSetHas(set, value)) return set;
  const index = bucketIndex(set.strategy.hash(value), set.capacity);
  const buckets = set.buckets.map((bucket, bucketIndexValue) =>
    bucketIndexValue === index ? bucket.filter((candidate) => !set.strategy.equals(candidate, value)) : [...bucket],
  );
  return { ...set, buckets, size: set.size - 1 };
}

export function forgeWebScriptSetValues<TValue>(set: ForgeWebScriptSet<TValue>): ForgeWebScriptVector<TValue> {
  return createForgeWebScriptVector(set.buckets.flat());
}

export function createForgeWebScriptMap<TKey, TValue>(
  entries: readonly ForgeWebScriptMapEntry<TKey, TValue>[] = [],
  strategy: ForgeWebScriptHashStrategy<TKey> = forgeWebScriptDefaultHashStrategy<TKey>(),
): ForgeWebScriptMap<TKey, TValue> {
  let result: ForgeWebScriptMap<TKey, TValue> = {
    kind: 'map',
    buckets: Array.from({ length: 4 }, () => []),
    size: 0,
    capacity: 4,
    strategy,
    ownership: 'owned',
  };
  for (const entry of entries) result = forgeWebScriptMapSet(result, entry.key, entry.value);
  return result;
}

export function forgeWebScriptMapGet<TKey, TValue>(
  map: ForgeWebScriptMap<TKey, TValue>,
  key: TKey,
): ForgeWebScriptOption<TValue> {
  const entry = (map.buckets[bucketIndex(map.strategy.hash(key), map.capacity)] ?? []).find((candidate) =>
    map.strategy.equals(candidate.key, key),
  );
  return entry === undefined ? forgeWebScriptNone() : forgeWebScriptSome(entry.value);
}

export function forgeWebScriptMapSet<TKey, TValue>(
  map: ForgeWebScriptMap<TKey, TValue>,
  key: TKey,
  value: TValue,
): ForgeWebScriptMap<TKey, TValue> {
  const index = bucketIndex(map.strategy.hash(key), map.capacity);
  const current = map.buckets[index] ?? [];
  const found = current.some((entry) => map.strategy.equals(entry.key, key));
  const nextSize = found ? map.size : map.size + 1;
  const capacity = nextSize > (map.capacity * 3) / 4 ? map.capacity * 2 : map.capacity;
  const source =
    capacity === map.capacity
      ? map.buckets
      : resizeBuckets(map.buckets, capacity, (entry) => map.strategy.hash(entry.key));
  const targetIndex = bucketIndex(map.strategy.hash(key), capacity);
  const buckets = source.map((bucket, bucketIndexValue) => {
    if (bucketIndexValue !== targetIndex) return [...bucket];
    const withoutKey = bucket.filter((entry) => !map.strategy.equals(entry.key, key));
    return [...withoutKey, { key, value }];
  });
  return { ...map, buckets, capacity, size: nextSize };
}

export function forgeWebScriptMapDelete<TKey, TValue>(
  map: ForgeWebScriptMap<TKey, TValue>,
  key: TKey,
): ForgeWebScriptMap<TKey, TValue> {
  if (forgeWebScriptMapGet(map, key).kind === 'none') return map;
  const index = bucketIndex(map.strategy.hash(key), map.capacity);
  return {
    ...map,
    size: map.size - 1,
    buckets: map.buckets.map((bucket, bucketIndexValue) =>
      bucketIndexValue === index ? bucket.filter((entry) => !map.strategy.equals(entry.key, key)) : [...bucket],
    ),
  };
}

export function forgeWebScriptMapEntries<TKey, TValue>(
  map: ForgeWebScriptMap<TKey, TValue>,
): ForgeWebScriptVector<ForgeWebScriptMapEntry<TKey, TValue>> {
  return createForgeWebScriptVector(map.buckets.flat());
}

function forgeWebScriptCanonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => forgeWebScriptCanonicalJson(entry)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .toSorted()
    .map((key) => `${JSON.stringify(key)}:${forgeWebScriptCanonicalJson(record[key])}`)
    .join(',')}}`;
}

export function forgeWebScriptDefaultHashStrategy<TValue>(): ForgeWebScriptHashStrategy<TValue> {
  return {
    hash: (value) => {
      const text = typeof value === 'string' ? value : forgeWebScriptCanonicalJson(value);
      let hash = 2_166_136_261;
      for (const character of text ?? '') hash = Math.imul(hash ^ character.codePointAt(0)!, 16_777_619);
      return hash >>> 0;
    },
    equals: (left, right) =>
      Object.is(left, right) || forgeWebScriptCanonicalJson(left) === forgeWebScriptCanonicalJson(right),
  };
}
