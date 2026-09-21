/**
 * Memory ownership semantics for collection elements ('owned', 'borrowed', 'shared').
 */
export type FlintCollectionOwnership = 'owned' | 'borrowed' | 'shared';

/** Option-like value used by safe reads and empty iterator terminals. */
export interface FlintOption<TValue> {
  readonly kind: 'none' | 'some';
  readonly value?: TValue;
}

/** Result-like value used by non-trapping collection mutation helpers. */
export interface FlintResultValue<TValue, TError = string> {
  readonly kind: 'error' | 'ok';
  readonly value?: TValue;
  readonly error?: TError;
}

/** Construct an empty Option value. */
export const flintNone = <TValue>(): FlintOption<TValue> => ({ kind: 'none' });

/** Construct a present Option value. */
export const flintSome = <TValue>(value: TValue): FlintOption<TValue> => ({ kind: 'some', value });

/** Construct a successful Result value. */
export const flintOk = <TValue, TError = string>(value: TValue): FlintResultValue<TValue, TError> => ({
  kind: 'ok',
  value,
});

/** Construct an error Result value without throwing. */
export const flintError = <TValue, TError = string>(error: TError): FlintResultValue<TValue, TError> => ({
  kind: 'error',
  error,
});

/**
 * Growable contiguous collection. Runtime-created vectors carry an owned handle
 * contract while borrowed/shared ownership is retained by derived values.
 */
export interface FlintVector<TValue> {
  readonly kind: 'vector';
  readonly values: readonly TValue[];
  /** Present on runtime-created vectors; legacy descriptors may derive it from values. */
  readonly length?: number;
  readonly capacity: number;
  readonly ownership: FlintCollectionOwnership;
}

/** Fixed-size contiguous collection; updates return a copied array value. */
export interface FlintArray<TValue> {
  readonly kind: 'array';
  readonly values: readonly TValue[];
  readonly length: number;
  readonly ownership: FlintCollectionOwnership;
}

/** One packed iterator pull result; done remains true after exhaustion. */
export interface FlintIteratorResult<TValue> {
  readonly done: boolean;
  readonly value?: TValue;
}

/** Lazy iterator view with descriptor capability and optional direct indexing. */
export interface FlintIterator<TValue> {
  readonly next: () => FlintIteratorResult<TValue>;
  readonly descriptor: FlintIteratorDescriptor;
  /** Number of source elements when known. This does not include consumed elements. */
  readonly length?: number;
  /** Non-consuming source-relative indexing, available for random-access iterators. */
  readonly at?: (index: number) => FlintOption<TValue>;
}

/** Any source accepted by serial and parallel iterator operations. */
export type FlintIterable<TValue> = FlintIterator<TValue> | FlintArray<TValue> | FlintVector<TValue> | Iterable<TValue>;

/** Linear consumption or non-consuming random access supported by an iterator. */
export type FlintIteratorCapability = 'linear' | 'random-access';

/** ABI metadata describing element representation, ownership, and access capability. */
export interface FlintIteratorDescriptor {
  readonly id: string;
  readonly elementType: string;
  readonly representation: 'descriptor-boundary';
  readonly ownership: FlintCollectionOwnership;
  /** Older descriptors default to linear for source compatibility. */
  readonly capability?: FlintIteratorCapability;
}

/** Create descriptor-boundary metadata; legacy callers default to linear access. */
export function createFlintIteratorDescriptor(
  id: string,
  elementType = 'unknown',
  capability: FlintIteratorCapability = 'linear',
  ownership: FlintCollectionOwnership = 'owned',
): FlintIteratorDescriptor {
  return { id, elementType, representation: 'descriptor-boundary', ownership, capability };
}

/**
 * Constructs a runtime descriptor describing iterator capabilities and element types.
 *
 * @param id - Stable iterator descriptor identifier.
 * @param elementType - Type name of iterated elements.
 * @param capability - Access capability ('linear' or 'random-access').
 * @param ownership - Memory ownership model.
 * @returns Initialized FlintIteratorDescriptor.
 */
function iteratorDescriptor(
  id: string,
  elementType: string,
  capability: FlintIteratorCapability = 'linear',
  ownership: FlintCollectionOwnership = 'owned',
): FlintIteratorDescriptor {
  return createFlintIteratorDescriptor(id, elementType, capability, ownership);
}

/** Adapt an arbitrary iterable to a lazy linear Flint iterator. */
export function flintIteratorFromIterable<TValue>(
  values: Iterable<TValue>,
  elementType = 'unknown',
  id = 'iterable',
): FlintIterator<TValue> {
  return createFlintIterator(values, iteratorDescriptor(id, elementType));
}

/**
 * Type guard checking if an iterable is a FlintIterator.
 *
 * @param value - Candidate iterable.
 * @returns True if value conforms to FlintIterator.
 */
function isFlintIterator<TValue>(value: FlintIterable<TValue>): value is FlintIterator<TValue> {
  return typeof value === 'object' && value !== null && 'next' in value && 'descriptor' in value;
}

/**
 * Type guard checking if an iterable is a FlintArray.
 *
 * @param value - Candidate iterable.
 * @returns True if value is a FlintArray.
 */
function isFlintArray<TValue>(value: FlintIterable<TValue>): value is FlintArray<TValue> {
  return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'array';
}

/**
 * Type guard checking if an iterable is a FlintVector.
 *
 * @param value - Candidate iterable.
 * @returns True if value is a FlintVector.
 */
function isFlintVector<TValue>(value: FlintIterable<TValue>): value is FlintVector<TValue> {
  return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'vector';
}

/**
 * Converts an arbitrary FlintIterable into a unified FlintIterator.
 *
 * @param value - Source iterable, array, or vector.
 * @returns Uniform FlintIterator instance.
 */
function asFlintIterator<TValue>(value: FlintIterable<TValue>): FlintIterator<TValue> {
  if (isFlintIterator(value)) return value;
  if (isFlintArray(value)) return flintIteratorFromArray(value);
  if (isFlintVector(value)) return flintIteratorFromVector(value);
  return flintIteratorFromIterable(value);
}

/** Lazily map values while retaining random access only when the source supports it. */
export function flintIteratorMap<TValue, TResult>(
  source: FlintIterator<TValue>,
  map: (value: TValue) => TResult,
  elementType = source.descriptor.elementType,
): FlintIterator<TResult> {
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
            const item = source.at?.(index) ?? flintNone<TValue>();
            return item.kind === 'none' ? flintNone<TResult>() : flintSome(map(item.value as TValue));
          },
        }
      : {}),
  };
}

/** Lazily filter values; filtering always downgrades capability to linear access. */
export function flintIteratorFilter<TValue>(
  source: FlintIterator<TValue>,
  predicate: (value: TValue) => boolean,
): FlintIterator<TValue> {
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
export function flintIteratorTake<TValue>(source: FlintIterator<TValue>, count: number): FlintIterator<TValue> {
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
          at: (index: number) => (validIndex(index, limit) ? (source.at?.(index) ?? flintNone<TValue>()) : flintNone()),
        }
      : {}),
  };
}

/** Lazily concatenates two sources without changing the order of either source. */
export function flintIteratorConcat<TValue>(
  first: FlintIterator<TValue>,
  second: FlintIterable<TValue>,
): FlintIterator<TValue> {
  const right = asFlintIterator(second);
  let current: FlintIterator<TValue> = first;
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
export function flintIteratorAdd<TValue>(source: FlintIterator<TValue>, value: TValue): FlintIterator<TValue> {
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
export function flintIteratorFlatten<TValue>(source: FlintIterator<FlintIterable<TValue>>): FlintIterator<TValue> {
  let nested: FlintIterator<TValue> | undefined;
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
        nested = asFlintIterator(outer.value as FlintIterable<TValue>);
      }
    },
    descriptor: iteratorDescriptor(`${source.descriptor.id}.flatten`, 'unknown', 'linear', source.descriptor.ownership),
  };
}

/**
 * Equality and hashing strategy interface for custom key types in Sets and Maps.
 */
export interface FlintHashStrategy<TValue> {
  readonly hash: (value: TValue) => number;
  readonly equals: (left: TValue, right: TValue) => boolean;
}

/**
 * Persistent hash set collection data structure.
 */
export interface FlintSet<TValue> {
  readonly kind: 'set';
  readonly buckets: readonly (readonly TValue[])[];
  readonly size: number;
  readonly capacity: number;
  readonly strategy: FlintHashStrategy<TValue>;
  readonly ownership: FlintCollectionOwnership;
}

/**
 * Key-value entry record in a persistent hash map.
 */
export interface FlintMapEntry<TKey, TValue> {
  readonly key: TKey;
  readonly value: TValue;
}

/**
 * Persistent hash map collection data structure.
 */
export interface FlintMap<TKey, TValue> {
  readonly kind: 'map';
  readonly buckets: readonly (readonly FlintMapEntry<TKey, TValue>[])[];
  readonly size: number;
  readonly capacity: number;
  readonly strategy: FlintHashStrategy<TKey>;
  readonly ownership: FlintCollectionOwnership;
}

/** Create an owned vector by copying the supplied values. */
export function createFlintVector<TValue>(
  values: readonly TValue[] = [],
  ownership: FlintCollectionOwnership = 'owned',
): FlintVector<TValue> {
  const copied = [...values];
  return { kind: 'vector', values: copied, length: copied.length, capacity: Math.max(4, copied.length), ownership };
}

/** Create a fixed array by copying the supplied values. */
export function createFlintArray<TValue>(
  values: readonly TValue[] = [],
  ownership: FlintCollectionOwnership = 'owned',
): FlintArray<TValue> {
  const copied = [...values];
  return { kind: 'array', values: copied, length: copied.length, ownership };
}

/**
 * Checks whether an index is non-negative and strictly less than length.
 *
 * @param index - Index to test.
 * @param length - Upper bound length.
 * @returns True if index is in bounds.
 */
function validIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length;
}

/**
 * Returns the current element count of a vector.
 *
 * @param vector - Vector instance.
 * @returns Element count.
 */
function vectorLength<TValue>(vector: FlintVector<TValue>): number {
  return vector.length ?? vector.values.length;
}

/**
 * Asserts that an index is valid for an array or vector, throwing an error if invalid.
 *
 * @param index - Candidate index.
 * @param length - Array length.
 * @param collection - Name of the collection type for diagnostic messages.
 * @throws {RangeError} If index is out of bounds.
 */
function requireIndex(index: number, length: number, collection: string): void {
  if (!validIndex(index, length))
    throw new RangeError(`${collection} index ${index} is out of bounds for length ${length}`);
}

/** Return an array length without consuming or copying its elements. */
export function flintArrayLength<TValue>(array: FlintArray<TValue>): number {
  return array.length;
}

/** Read an array element; invalid indices return Option.none. */
export function flintArrayGet<TValue>(array: FlintArray<TValue>, index: number): FlintOption<TValue> {
  return validIndex(index, array.length) ? flintSome(array.values[index] as TValue) : flintNone();
}

/** Replace an array element; invalid indices throw RangeError. */
export function flintArraySet<TValue>(array: FlintArray<TValue>, index: number, value: TValue): FlintArray<TValue> {
  requireIndex(index, array.length, 'array');
  const values = [...array.values];
  values[index] = value;
  return { ...array, values };
}

/** Replace an array element without throwing; invalid indices return an error result. */
export function flintArrayTrySet<TValue>(
  array: FlintArray<TValue>,
  index: number,
  value: TValue,
): FlintResultValue<FlintArray<TValue>> {
  return validIndex(index, array.length)
    ? flintOk(flintArraySet(array, index, value))
    : flintError(`array index ${index} is out of bounds`);
}

/** Append a value and grow capacity as needed, preserving ownership. */
export function flintVectorPush<TValue>(vector: FlintVector<TValue>, value: TValue): FlintVector<TValue> {
  const values = [...vector.values, value];
  return {
    ...vector,
    values,
    length: values.length,
    capacity: values.length > vector.capacity ? Math.max(1, vector.capacity * 2) : vector.capacity,
  };
}

/** Alias for vector push, matching the stdlib iterator `add` vocabulary. */
export const flintVectorAdd = flintVectorPush;

/** Remove the final vector value and return the updated vector plus Option result. */
export function flintVectorPop<TValue>(vector: FlintVector<TValue>): {
  readonly vector: FlintVector<TValue>;
  readonly value: FlintOption<TValue>;
} {
  if (vector.values.length === 0) return { vector, value: flintNone() };
  const values = vector.values.slice(0, -1);
  return {
    vector: { ...vector, values, length: values.length },
    value: flintSome(vector.values.at(-1) as TValue),
  };
}

/** Read a vector element; invalid indices return Option.none. */
export function flintVectorGet<TValue>(vector: FlintVector<TValue>, index: number): FlintOption<TValue> {
  return validIndex(index, vectorLength(vector)) ? flintSome(vector.values[index] as TValue) : flintNone();
}

/** Return the number of initialized vector elements. */
export function flintVectorLength<TValue>(vector: FlintVector<TValue>): number {
  return vectorLength(vector);
}

/** Replace a vector element; invalid indices throw RangeError. */
export function flintVectorSet<TValue>(vector: FlintVector<TValue>, index: number, value: TValue): FlintVector<TValue> {
  requireIndex(index, vectorLength(vector), 'vector');
  const values = [...vector.values];
  values[index] = value;
  return { ...vector, values };
}

/** Replace a vector element without throwing; invalid indices return an error result. */
export function flintVectorTrySet<TValue>(
  vector: FlintVector<TValue>,
  index: number,
  value: TValue,
): FlintResultValue<FlintVector<TValue>> {
  return validIndex(index, vectorLength(vector))
    ? flintOk(flintVectorSet(vector, index, value))
    : flintError(`vector index ${index} is out of bounds`);
}

/** Eagerly map a vector into a new vector in source index order. */
export function flintVectorMap<TValue, TResult>(
  vector: FlintVector<TValue>,
  transform: (value: TValue, index: number) => TResult,
): FlintVector<TResult> {
  const values: TResult[] = [];
  for (const [index, value] of vector.values.entries()) values.push(transform(value, index));
  return createFlintVector(values, vector.ownership);
}

/** Eagerly filter a vector into a new vector while preserving source order. */
export function flintVectorFilter<TValue>(
  vector: FlintVector<TValue>,
  predicate: (value: TValue, index: number) => boolean,
): FlintVector<TValue> {
  const values: TValue[] = [];
  for (const [index, value] of vector.values.entries()) if (predicate(value, index)) values.push(value);
  return createFlintVector(values, vector.ownership);
}

/** Fold vector values left-to-right, including the supplied initial accumulator. */
export function flintVectorFold<TValue, TResult>(
  vector: FlintVector<TValue>,
  initial: TResult,
  reducer: (accumulator: TResult, value: TValue, index: number) => TResult,
): TResult {
  let result = initial;
  for (const [index, value] of vector.values.entries()) result = reducer(result, value, index);
  return result;
}

/** Adapt an iterable to a lazy iterator with the supplied ABI descriptor. */
export function createFlintIterator<TValue>(
  values: Iterable<TValue>,
  descriptor: FlintIteratorDescriptor,
): FlintIterator<TValue> {
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
export function flintIteratorFromVector<TValue>(
  vector: FlintVector<TValue>,
  descriptor: FlintIteratorDescriptor = iteratorDescriptor('vector', 'unknown', 'random-access', vector.ownership),
): FlintIterator<TValue> {
  return flintIteratorFromIndexedValues(vector.values, withRandomAccessCapability(descriptor));
}

/** Create a random-access iterator over a fixed array without changing its ownership. */
export function flintIteratorFromArray<TValue>(
  array: FlintArray<TValue>,
  descriptor: FlintIteratorDescriptor = iteratorDescriptor('array', 'unknown', 'random-access', array.ownership),
): FlintIterator<TValue> {
  return flintIteratorFromIndexedValues(array.values, withRandomAccessCapability(descriptor));
}

/**
 * Attaches random-access capabilities to an iterator descriptor if permitted.
 *
 * @param descriptor - Base descriptor.
 * @returns Iterator descriptor with random-access capability.
 */
function withRandomAccessCapability(descriptor: FlintIteratorDescriptor): FlintIteratorDescriptor {
  return descriptor.capability === undefined ? { ...descriptor, capability: 'random-access' } : descriptor;
}

/**
 * Builds a random-access iterator over an array of indexed values.
 *
 * @param values - Array of values to iterate.
 * @param descriptor - Iterator descriptor.
 * @returns Configured FlintIterator instance.
 */
function flintIteratorFromIndexedValues<TValue>(
  values: readonly TValue[],
  descriptor: FlintIteratorDescriptor,
): FlintIterator<TValue> {
  const iterator = values[Symbol.iterator]();
  let exhausted = false;
  const randomAccess = descriptor.capability === 'random-access';
  return {
    descriptor,
    length: values.length,
    at: randomAccess
      ? (index) => (validIndex(index, values.length) ? flintSome(values[index] as TValue) : flintNone())
      : undefined,
    next: () => {
      if (exhausted) return { done: true };
      const result = iterator.next();
      exhausted = result.done === true;
      return result.done === true ? { done: true } : { done: false, value: result.value };
    },
  };
}

/**
 * Materializes an iterator into an owned vector of collected values.
 *
 * @param iterator - Source iterator to drain.
 * @returns FlintVector containing collected values.
 */
export function flintIteratorCollect<TValue>(iterator: FlintIterator<TValue>): FlintVector<TValue> {
  const values: TValue[] = [];
  let item = iterator.next();
  while (!item.done) {
    values.push(item.value as TValue);
    item = iterator.next();
  }
  return createFlintVector(values);
}

/**
 * Returns the first element of an iterator wrapped in an Option.
 *
 * @param iterator - Source iterator.
 * @returns Option containing first element or none.
 */
export function flintIteratorFirst<TValue>(iterator: FlintIterator<TValue>): FlintOption<TValue> {
  const item = iterator.next();
  return item.done ? flintNone() : flintSome(item.value as TValue);
}

/**
 * Returns the last element of an iterator wrapped in an Option.
 *
 * @param iterator - Source iterator.
 * @returns Option containing last element or none.
 */
// skipcq: JS-R1005
export function flintIteratorLast<TValue>(iterator: FlintIterator<TValue>): FlintOption<TValue> {
  if (
    iterator.descriptor.capability === 'random-access' &&
    iterator.at !== undefined &&
    iterator.length !== undefined
  ) {
    return iterator.length === 0 ? flintNone() : iterator.at(-1);
  }
  let last = flintNone<TValue>();
  let item = iterator.next();
  while (!item.done) {
    last = flintSome(item.value as TValue);
    item = iterator.next();
  }
  return last;
}

/**
 * Returns the element at a specified index wrapped in an Option.
 *
 * @param iterator - Source iterator.
 * @param index - Zero-based element index.
 * @returns Option containing element at index or none.
 */
// skipcq: JS-R1005
export function flintIteratorAt<TValue>(iterator: FlintIterator<TValue>, index: number): FlintOption<TValue> {
  if (!Number.isInteger(index) || index < 0) return flintNone();
  if (iterator.descriptor.capability === 'random-access' && iterator.at !== undefined) return iterator.at(index);
  let current = 0;
  let item = iterator.next();
  while (!item.done) {
    if (current === index) return flintSome(item.value as TValue);
    current += 1;
    item = iterator.next();
  }
  return flintNone();
}

/**
 * Reduces an iterator from left to right using an accumulator callback.
 *
 * @param iterator - Source iterator.
 * @param initial - Initial accumulator value.
 * @param reducer - Reducing callback function.
 * @returns Final reduced accumulator result.
 */
export function flintIteratorFold<TValue, TResult>(
  iterator: FlintIterator<TValue>,
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

/**
 * Converts an iterator into an owned FlintArray.
 *
 * @param iterator - Source iterator.
 * @param ownership - Collection ownership model.
 * @returns Initialized FlintArray.
 */
export function flintIteratorToArray<TValue>(
  iterator: FlintIterator<TValue>,
  ownership: FlintCollectionOwnership = 'owned',
): FlintArray<TValue> {
  return createFlintArray(flintIteratorCollect(iterator).values, ownership);
}

// skipcq: JS-D1001
const bucketIndex = (hash: number, capacity: number): number => {
  const normalized = Math.abs(Math.trunc(hash));
  return normalized % capacity;
};

/**
 * Rehashes hash table entries into a resized bucket array.
 *
 * @param buckets - Current hash buckets.
 * @param size - Current element count.
 * @param hashStrategy - Hashing strategy.
 * @param entryHash - Entry hash extraction callback.
 * @returns Resized bucket array.
 */
function resizeBuckets<TValue>(
  buckets: readonly (readonly TValue[])[],
  capacity: number,
  hash: (value: TValue) => number,
): readonly (readonly TValue[])[] {
  const resized = Array.from({ length: capacity }, () => [] as TValue[]);
  for (const bucket of buckets) for (const value of bucket) resized[bucketIndex(hash(value), capacity)]?.push(value);
  return resized;
}

/**
 * Creates a persistent FlintSet initialized with values.
 *
 * @param values - Initial iterable of values.
 * @param hashStrategy - Custom equality and hashing strategy.
 * @returns Initialized FlintSet instance.
 */
export function createFlintSet<TValue>(
  values: readonly TValue[] = [],
  strategy: FlintHashStrategy<TValue> = flintDefaultHashStrategy<TValue>(),
): FlintSet<TValue> {
  let result: FlintSet<TValue> = {
    kind: 'set',
    buckets: Array.from({ length: 4 }, () => []),
    size: 0,
    capacity: 4,
    strategy,
    ownership: 'owned',
  };
  for (const value of values) result = flintSetAdd(result, value);
  return result;
}

/**
 * Tests whether a value exists in the set.
 *
 * @param set - Target set.
 * @param value - Value to check.
 * @returns True if value is present.
 */
export function flintSetHas<TValue>(set: FlintSet<TValue>, value: TValue): boolean {
  return (set.buckets[bucketIndex(set.strategy.hash(value), set.capacity)] ?? []).some((candidate) =>
    set.strategy.equals(candidate, value),
  );
}

/**
 * Adds an element to the set, returning a new persistent set if modified.
 *
 * @param set - Target set.
 * @param value - Value to insert.
 * @returns Updated persistent set.
 */
export function flintSetAdd<TValue>(set: FlintSet<TValue>, value: TValue): FlintSet<TValue> {
  if (flintSetHas(set, value)) return set;
  const capacity = set.size + 1 > (set.capacity * 3) / 4 ? set.capacity * 2 : set.capacity;
  const buckets = (
    capacity === set.capacity
      ? set.buckets.map((bucket) => [...bucket])
      : resizeBuckets(set.buckets, capacity, set.strategy.hash)
  ) as TValue[][];
  buckets[bucketIndex(set.strategy.hash(value), capacity)]?.push(value);
  return { ...set, buckets, capacity, size: set.size + 1 };
}

/**
 * Deletes an element from the set, returning a new persistent set if modified.
 *
 * @param set - Target set.
 * @param value - Value to remove.
 * @returns Updated persistent set.
 */
export function flintSetDelete<TValue>(set: FlintSet<TValue>, value: TValue): FlintSet<TValue> {
  if (!flintSetHas(set, value)) return set;
  const index = bucketIndex(set.strategy.hash(value), set.capacity);
  const buckets = set.buckets.map((bucket, bucketIndexValue) =>
    bucketIndexValue === index ? bucket.filter((candidate) => !set.strategy.equals(candidate, value)) : [...bucket],
  );
  return { ...set, buckets, size: set.size - 1 };
}

/**
 * Returns all values contained in the set as an owned vector.
 *
 * @param set - Target set.
 * @returns Vector of values in the set.
 */
export function flintSetValues<TValue>(set: FlintSet<TValue>): FlintVector<TValue> {
  return createFlintVector(set.buckets.flat());
}

/**
 * Creates a persistent FlintMap initialized with key-value entries.
 *
 * @param entries - Initial key-value tuples.
 * @param hashStrategy - Custom key equality and hashing strategy.
 * @returns Initialized FlintMap instance.
 */
export function createFlintMap<TKey, TValue>(
  entries: readonly FlintMapEntry<TKey, TValue>[] = [],
  strategy: FlintHashStrategy<TKey> = flintDefaultHashStrategy<TKey>(),
): FlintMap<TKey, TValue> {
  let result: FlintMap<TKey, TValue> = {
    kind: 'map',
    buckets: Array.from({ length: 4 }, () => []),
    size: 0,
    capacity: 4,
    strategy,
    ownership: 'owned',
  };
  for (const entry of entries) result = flintMapSet(result, entry.key, entry.value);
  return result;
}

/**
 * Retrieves the value associated with a key from the map.
 *
 * @param map - Target map.
 * @param key - Lookup key.
 * @returns Option containing value or none.
 */
export function flintMapGet<TKey, TValue>(map: FlintMap<TKey, TValue>, key: TKey): FlintOption<TValue> {
  const entry = (map.buckets[bucketIndex(map.strategy.hash(key), map.capacity)] ?? []).find((candidate) =>
    map.strategy.equals(candidate.key, key),
  );
  return entry === undefined ? flintNone() : flintSome(entry.value);
}

/**
 * Inserts or updates a key-value mapping, returning a new persistent map.
 *
 * @param map - Target map.
 * @param key - Mapping key.
 * @param value - Mapping value.
 * @returns Updated persistent map.
 */
export function flintMapSet<TKey, TValue>(
  map: FlintMap<TKey, TValue>,
  key: TKey,
  value: TValue,
): FlintMap<TKey, TValue> {
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

/**
 * Deletes a key-value mapping from the map, returning a new persistent map.
 *
 * @param map - Target map.
 * @param key - Key to delete.
 * @returns Updated persistent map.
 */
export function flintMapDelete<TKey, TValue>(map: FlintMap<TKey, TValue>, key: TKey): FlintMap<TKey, TValue> {
  if (flintMapGet(map, key).kind === 'none') return map;
  const index = bucketIndex(map.strategy.hash(key), map.capacity);
  return {
    ...map,
    size: map.size - 1,
    buckets: map.buckets.map((bucket, bucketIndexValue) =>
      bucketIndexValue === index ? bucket.filter((entry) => !map.strategy.equals(entry.key, key)) : [...bucket],
    ),
  };
}

/**
 * Returns all key-value entries contained in the map as an owned vector.
 *
 * @param map - Target map.
 * @returns Vector of entries in the map.
 */
export function flintMapEntries<TKey, TValue>(map: FlintMap<TKey, TValue>): FlintVector<FlintMapEntry<TKey, TValue>> {
  return createFlintVector(map.buckets.flat());
}

/**
 * Deterministically serializes values for hashing.
 *
 * @param value - Value to serialize.
 * @returns Canonical JSON string.
 */
function flintCanonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => flintCanonicalJson(entry)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .toSorted()
    .map((key) => `${JSON.stringify(key)}:${flintCanonicalJson(record[key])}`)
    .join(',')}}`;
}

/**
 * Returns the default hash strategy using deterministic serialization.
 *
 * @returns Default FlintHashStrategy instance.
 */
export function flintDefaultHashStrategy<TValue>(): FlintHashStrategy<TValue> {
  return {
    hash: (value) => {
      const text = typeof value === 'string' ? value : flintCanonicalJson(value);
      let hash = 2_166_136_261;
      for (const character of text) hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), 16_777_619);
      return hash >>> 0;
    },
    equals: (left, right) => Object.is(left, right) || flintCanonicalJson(left) === flintCanonicalJson(right),
  };
}
