import {
  createFlintArray,
  createFlintIteratorDescriptor,
  createFlintVector,
  flintIteratorCollect,
  flintIteratorFromArray,
  flintIteratorFromIterable,
  flintIteratorFromVector,
  flintNone,
  flintSome,
  type FlintArray,
  type FlintCollectionOwnership,
  type FlintIterable,
  type FlintIterator,
  type FlintOption,
  type FlintVector,
} from './collections.js';
import { canUseFlintWasmThreads, type FlintWasmThreadTargetFeatures } from './threading.js';

/** Execution strategy selected for an ordered parallel operation. */
export type FlintParallelStrategy = 'serial' | 'host-workers' | 'wasm-threads';
/** Canonical parallel operation names exposed by the runtime; `par_filter` is intentional. */
export type FlintParallelOperation =
  | 'par_map'
  | 'par_filter'
  | 'par_flatten'
  | 'par_collect'
  | 'par_to_array'
  | 'par_fold'
  | 'par_first'
  | 'par_last'
  | 'par_at';

/** Capability names used to authorize worker, thread, atomic, and shared-memory execution. */
export const FLINT_PARALLEL_CAPABILITIES = {
  hostWorkers: 'scheduler.worker',
  wasmThreads: 'wasm.threads',
  atomics: 'wasm.atomics',
  sharedMemory: 'wasm.shared-memory',
} as const;

/**
 * Runtime metadata for one parallel operation. `ordered` is always true: the
 * source index, rather than worker completion timing, defines output order.
 */
export interface FlintParallelOperationDescriptor {
  readonly operation: FlintParallelOperation;
  readonly ordered: true;
  readonly strategies: readonly FlintParallelStrategy[];
  readonly capability: 'linear' | 'random-access';
}

/** Stable descriptors for every serial-fallback-capable parallel operation. */
export const FLINT_PARALLEL_OPERATION_DESCRIPTORS: Readonly<
  Record<FlintParallelOperation, FlintParallelOperationDescriptor>
> = {
  par_map: {
    operation: 'par_map',
    ordered: true,
    strategies: ['serial', 'host-workers', 'wasm-threads'],
    capability: 'random-access',
  },
  par_filter: {
    operation: 'par_filter',
    ordered: true,
    strategies: ['serial', 'host-workers', 'wasm-threads'],
    capability: 'random-access',
  },
  par_flatten: {
    operation: 'par_flatten',
    ordered: true,
    strategies: ['serial', 'host-workers', 'wasm-threads'],
    capability: 'random-access',
  },
  par_collect: {
    operation: 'par_collect',
    ordered: true,
    strategies: ['serial', 'host-workers', 'wasm-threads'],
    capability: 'random-access',
  },
  par_to_array: {
    operation: 'par_to_array',
    ordered: true,
    strategies: ['serial', 'host-workers', 'wasm-threads'],
    capability: 'random-access',
  },
  par_fold: {
    operation: 'par_fold',
    ordered: true,
    strategies: ['serial', 'host-workers', 'wasm-threads'],
    capability: 'linear',
  },
  par_first: {
    operation: 'par_first',
    ordered: true,
    strategies: ['serial', 'host-workers', 'wasm-threads'],
    capability: 'linear',
  },
  par_last: {
    operation: 'par_last',
    ordered: true,
    strategies: ['serial', 'host-workers', 'wasm-threads'],
    capability: 'linear',
  },
  par_at: {
    operation: 'par_at',
    ordered: true,
    strategies: ['serial', 'host-workers', 'wasm-threads'],
    capability: 'linear',
  },
};

/** Minimal scheduler boundary used by host workers or a compiled Wasm thread runner. */
export interface FlintParallelExecutor {
  readonly schedule: <TValue>(index: number, task: () => TValue | PromiseLike<TValue>) => Promise<TValue>;
  readonly close: () => void;
}

/**
 * Strategy request and capability inputs. `auto` prefers permitted Wasm threads,
 * then host workers, and finally serial execution; no unsafe capability is inferred.
 */
export interface FlintParallelOptions {
  readonly strategy?: 'auto' | FlintParallelStrategy;
  readonly capabilities?: readonly string[];
  readonly targetFeatures?: FlintWasmThreadTargetFeatures;
  readonly hostWorkers?: FlintParallelExecutor;
  /** This must be backed by a compiled WASM thread runner; it is never synthesized here. */
  readonly wasmThreads?: FlintParallelExecutor;
}

/** Selected strategy and the explicit reason it was selected. */
export interface FlintParallelPlan {
  readonly requested: 'auto' | FlintParallelStrategy;
  readonly strategy: FlintParallelStrategy;
  readonly reason: 'requested-serial' | 'wasm-capable' | 'host-worker-capable' | 'fallback-serial';
}

/**
 * Evaluates whether host worker capabilities are authorized in the given capability list.
 *
 * @param capabilities - Authorized capabilities or undefined if unconstrained.
 * @returns True if host worker execution is authorized.
 */
function hasHostWorkerCapability(capabilities: readonly string[] | undefined): boolean {
  return capabilities === undefined || capabilities.includes(FLINT_PARALLEL_CAPABILITIES.hostWorkers);
}

/** Select a permitted strategy without changing the operation's result contract. */
export function selectFlintParallelStrategy(options: FlintParallelOptions = {}): FlintParallelPlan {
  const requested = options.strategy ?? 'auto';
  if (requested === 'serial') return { requested, strategy: 'serial', reason: 'requested-serial' };
  const wasmCapable =
    options.wasmThreads !== undefined && canUseFlintWasmThreads(options.targetFeatures, options.capabilities);
  if ((requested === 'wasm-threads' || requested === 'auto') && wasmCapable)
    return { requested, strategy: 'wasm-threads', reason: 'wasm-capable' };
  if (
    (requested === 'host-workers' || requested === 'auto') &&
    options.hostWorkers !== undefined &&
    hasHostWorkerCapability(options.capabilities)
  )
    return { requested, strategy: 'host-workers', reason: 'host-worker-capable' };
  return { requested, strategy: 'serial', reason: 'fallback-serial' };
}

/** Describe an operation and attach the strategy selected from the supplied options. */
export function flintParallelDescriptor(
  operation: FlintParallelOperation,
  options: FlintParallelOptions = {},
): FlintParallelOperationDescriptor & { readonly selectedStrategy: FlintParallelStrategy } {
  return {
    ...FLINT_PARALLEL_OPERATION_DESCRIPTORS[operation],
    selectedStrategy: selectFlintParallelStrategy(options).strategy,
  };
}

/**
 * Normalizes an arbitrary FlintIterable into a unified FlintIterator.
 *
 * @param source - Iterable, array, vector, or iterator to convert.
 * @returns FlintIterator instance.
 */
function asIterator<TValue>(source: FlintIterable<TValue>): FlintIterator<TValue> {
  if (typeof source === 'object' && source !== null && 'next' in source && 'descriptor' in source)
    return source as FlintIterator<TValue>;
  if (typeof source === 'object' && source !== null && 'kind' in source && source.kind === 'array')
    return flintIteratorFromArray(source as FlintArray<TValue>);
  if (typeof source === 'object' && source !== null && 'kind' in source && source.kind === 'vector')
    return flintIteratorFromVector(source as FlintVector<TValue>);
  return flintIteratorFromIterable(source as Iterable<TValue>);
}

/**
 * Executes an indexed task across array elements using the selected parallel execution plan.
 *
 * @param values - Array of elements to process.
 * @param task - Indexed operation callback.
 * @param options - Parallel execution options.
 * @returns Object containing ordered result values and executed plan metadata.
 */
async function runIndexed<TValue, TResult>(
  values: readonly TValue[],
  task: (value: TValue, index: number) => TResult | PromiseLike<TResult>,
  options: FlintParallelOptions,
): Promise<{ readonly values: readonly TResult[]; readonly plan: FlintParallelPlan }> {
  const plan = selectFlintParallelStrategy(options);
  const executor: FlintParallelExecutor | undefined =
    plan.strategy === 'host-workers'
      ? options.hostWorkers
      : plan.strategy === 'wasm-threads'
        ? options.wasmThreads
        : undefined;
  if (executor === undefined) {
    const result: TResult[] = [];
    for (const [index, value] of values.entries()) result.push(await task(value, index));
    return { values: result, plan };
  }
  try {
    // Promise.all preserves the input-index order even when completion is uneven.
    const result = await Promise.all(values.map((value, index) => executor.schedule(index, () => task(value, index))));
    return { values: result, plan };
  } finally {
    executor.close();
  }
}

/**
 * Packages an array of parallel computation results into an ordered random-access FlintIterator.
 *
 * @param source - Source iterator providing base descriptor metadata.
 * @param values - Ordered result array.
 * @param operation - Executed parallel operation identifier.
 * @param ownership - Collection memory ownership model.
 * @returns Configured random-access FlintIterator.
 */
function resultIterator<TValue>(
  source: FlintIterator<unknown>,
  values: readonly TValue[],
  operation: FlintParallelOperation,
  ownership: FlintCollectionOwnership = source.descriptor.ownership,
): FlintIterator<TValue> {
  const array = createFlintArray(values, ownership);
  return flintIteratorFromArray(
    array,
    createFlintIteratorDescriptor(
      `${source.descriptor.id}.${operation}`,
      source.descriptor.elementType,
      'random-access',
      ownership,
    ),
  );
}

/**
 * Apply a callback in parallel and return a lazy-compatible ordered iterator.
 * Callback errors reject the operation and are not hidden by serial fallback.
 */
export async function flintIteratorParMap<TValue, TResult>(
  source: FlintIterable<TValue>,
  map: (value: TValue, index: number) => TResult | PromiseLike<TResult>,
  options: FlintParallelOptions = {},
): Promise<FlintIterator<TResult>> {
  const iterator = asIterator(source);
  const values = flintIteratorCollect(iterator).values;
  const result = await runIndexed(values, map, options);
  return resultIterator(iterator, result.values, 'par_map');
}

/**
 * Evaluate a predicate in parallel and retain accepted values in source order.
 * This is the canonical `par_filter` API.
 */
export async function flintIteratorParFilter<TValue>(
  source: FlintIterable<TValue>,
  predicate: (value: TValue, index: number) => boolean | PromiseLike<boolean>,
  options: FlintParallelOptions = {},
): Promise<FlintIterator<TValue>> {
  const iterator = asIterator(source);
  const values = flintIteratorCollect(iterator).values;
  const accepted = await runIndexed(values, predicate, options);
  return resultIterator(
    iterator,
    values.filter((_value, index) => accepted.values[index] === true),
    'par_filter',
  );
}

/** Flatten nested sources in parallel while preserving outer and inner order. */
export async function flintIteratorParFlatten<TValue>(
  source: FlintIterable<FlintIterable<TValue>>,
  options: FlintParallelOptions = {},
): Promise<FlintIterator<TValue>> {
  const iterator = asIterator(source);
  const values = flintIteratorCollect(iterator).values;
  const nested = await runIndexed(values, (value) => flintIteratorCollect(asIterator(value)).values, options);
  return resultIterator(iterator, nested.values.flat(), 'par_flatten');
}

/**
 * Collects an iterable and executes a parallel map operation, returning an array of results.
 *
 * @param source - Source iterable.
 * @param options - Parallel execution options.
 * @returns Ordered array of mapped results.
 */
async function materializeParallel<TValue>(
  source: FlintIterable<TValue>,
  options: FlintParallelOptions,
): Promise<readonly TValue[]> {
  const iterator = asIterator(source);
  const values = flintIteratorCollect(iterator).values;
  const result = await runIndexed(values, (value) => value, options);
  return result.values;
}

/** Materialize ordered parallel results into an owned vector. */
export async function flintIteratorParCollect<TValue>(
  source: FlintIterable<TValue>,
  options: FlintParallelOptions = {},
): Promise<FlintVector<TValue>> {
  return createFlintVector(await materializeParallel(source, options));
}

/** Materialize ordered parallel results into an owned fixed array. */
export async function flintIteratorParToArray<TValue>(
  source: FlintIterable<TValue>,
  options: FlintParallelOptions = {},
): Promise<FlintArray<TValue>> {
  return createFlintArray(await materializeParallel(source, options));
}

/** Fold ordered results left-to-right, including the supplied initial accumulator. */
export async function flintIteratorParFold<TValue, TResult>(
  source: FlintIterable<TValue>,
  initial: TResult,
  reducer: (accumulator: TResult, value: TValue, index: number) => TResult,
  options: FlintParallelOptions = {},
): Promise<TResult> {
  const values = await materializeParallel(source, options);
  let result = initial;
  for (const [index, value] of values.entries()) result = reducer(result, value, index);
  return result;
}

/** Return the first ordered result, or an Option.none value for an empty source. */
export async function flintIteratorParFirst<TValue>(
  source: FlintIterable<TValue>,
  options: FlintParallelOptions = {},
): Promise<FlintOption<TValue>> {
  const values = await materializeParallel(source, options);
  return values.length === 0 ? flintNone() : flintSome(values[0] as TValue);
}

/** Return the last ordered result, or an Option.none value for an empty source. */
export async function flintIteratorParLast<TValue>(
  source: FlintIterable<TValue>,
  options: FlintParallelOptions = {},
): Promise<FlintOption<TValue>> {
  const values = await materializeParallel(source, options);
  return values.length === 0 ? flintNone() : flintSome(values.at(-1) as TValue);
}

/** Return the zero-based ordered result, or Option.none when index is invalid. */
export async function flintIteratorParAt<TValue>(
  source: FlintIterable<TValue>,
  index: number,
  options: FlintParallelOptions = {},
): Promise<FlintOption<TValue>> {
  const values = await materializeParallel(source, options);
  return Number.isInteger(index) && index >= 0 && index < values.length
    ? flintSome(values[index] as TValue)
    : flintNone();
}
