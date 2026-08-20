import {
  createForgeWebScriptArray,
  createForgeWebScriptIteratorDescriptor,
  createForgeWebScriptVector,
  forgeWebScriptIteratorCollect,
  forgeWebScriptIteratorFromArray,
  forgeWebScriptIteratorFromIterable,
  forgeWebScriptIteratorFromVector,
  forgeWebScriptNone,
  forgeWebScriptSome,
  type ForgeWebScriptArray,
  type ForgeWebScriptCollectionOwnership,
  type ForgeWebScriptIterable,
  type ForgeWebScriptIterator,
  type ForgeWebScriptOption,
  type ForgeWebScriptVector,
} from './collections.js';
import { canUseForgeWebScriptWasmThreads, type ForgeWebScriptWasmThreadTargetFeatures } from './threading.js';

/** Execution strategy selected for an ordered parallel operation. */
export type ForgeWebScriptParallelStrategy = 'serial' | 'host-workers' | 'wasm-threads';
/** Canonical parallel operation names exposed by the runtime; `par_filter` is intentional. */
export type ForgeWebScriptParallelOperation =
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
export const FORGE_WEB_SCRIPT_PARALLEL_CAPABILITIES = {
  hostWorkers: 'scheduler.worker',
  wasmThreads: 'wasm.threads',
  atomics: 'wasm.atomics',
  sharedMemory: 'wasm.shared-memory',
} as const;

/**
 * Runtime metadata for one parallel operation. `ordered` is always true: the
 * source index, rather than worker completion timing, defines output order.
 */
export interface ForgeWebScriptParallelOperationDescriptor {
  readonly operation: ForgeWebScriptParallelOperation;
  readonly ordered: true;
  readonly strategies: readonly ForgeWebScriptParallelStrategy[];
  readonly capability: 'linear' | 'random-access';
}

/** Stable descriptors for every serial-fallback-capable parallel operation. */
export const FORGE_WEB_SCRIPT_PARALLEL_OPERATION_DESCRIPTORS: Readonly<
  Record<ForgeWebScriptParallelOperation, ForgeWebScriptParallelOperationDescriptor>
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
export interface ForgeWebScriptParallelExecutor {
  readonly schedule: <TValue>(index: number, task: () => TValue | PromiseLike<TValue>) => Promise<TValue>;
  readonly close: () => void;
}

/**
 * Strategy request and capability inputs. `auto` prefers permitted Wasm threads,
 * then host workers, and finally serial execution; no unsafe capability is inferred.
 */
export interface ForgeWebScriptParallelOptions {
  readonly strategy?: 'auto' | ForgeWebScriptParallelStrategy;
  readonly capabilities?: readonly string[];
  readonly targetFeatures?: ForgeWebScriptWasmThreadTargetFeatures;
  readonly hostWorkers?: ForgeWebScriptParallelExecutor;
  /** This must be backed by a compiled WASM thread runner; it is never synthesized here. */
  readonly wasmThreads?: ForgeWebScriptParallelExecutor;
}

/** Selected strategy and the explicit reason it was selected. */
export interface ForgeWebScriptParallelPlan {
  readonly requested: 'auto' | ForgeWebScriptParallelStrategy;
  readonly strategy: ForgeWebScriptParallelStrategy;
  readonly reason: 'requested-serial' | 'wasm-capable' | 'host-worker-capable' | 'fallback-serial';
}

function hasHostWorkerCapability(capabilities: readonly string[] | undefined): boolean {
  return capabilities === undefined || capabilities.includes(FORGE_WEB_SCRIPT_PARALLEL_CAPABILITIES.hostWorkers);
}

/** Select a permitted strategy without changing the operation's result contract. */
export function selectForgeWebScriptParallelStrategy(
  options: ForgeWebScriptParallelOptions = {},
): ForgeWebScriptParallelPlan {
  const requested = options.strategy ?? 'auto';
  if (requested === 'serial') return { requested, strategy: 'serial', reason: 'requested-serial' };
  const wasmCapable =
    options.wasmThreads !== undefined && canUseForgeWebScriptWasmThreads(options.targetFeatures, options.capabilities);
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
export function forgeWebScriptParallelDescriptor(
  operation: ForgeWebScriptParallelOperation,
  options: ForgeWebScriptParallelOptions = {},
): ForgeWebScriptParallelOperationDescriptor & { readonly selectedStrategy: ForgeWebScriptParallelStrategy } {
  return {
    ...FORGE_WEB_SCRIPT_PARALLEL_OPERATION_DESCRIPTORS[operation],
    selectedStrategy: selectForgeWebScriptParallelStrategy(options).strategy,
  };
}

function asIterator<TValue>(source: ForgeWebScriptIterable<TValue>): ForgeWebScriptIterator<TValue> {
  if (typeof source === 'object' && source !== null && 'next' in source && 'descriptor' in source)
    return source as ForgeWebScriptIterator<TValue>;
  if (typeof source === 'object' && source !== null && 'kind' in source && source.kind === 'array')
    return forgeWebScriptIteratorFromArray(source as ForgeWebScriptArray<TValue>);
  if (typeof source === 'object' && source !== null && 'kind' in source && source.kind === 'vector')
    return forgeWebScriptIteratorFromVector(source as ForgeWebScriptVector<TValue>);
  return forgeWebScriptIteratorFromIterable(source as Iterable<TValue>);
}

async function runIndexed<TValue, TResult>(
  values: readonly TValue[],
  task: (value: TValue, index: number) => TResult | PromiseLike<TResult>,
  options: ForgeWebScriptParallelOptions,
): Promise<{ readonly values: readonly TResult[]; readonly plan: ForgeWebScriptParallelPlan }> {
  const plan = selectForgeWebScriptParallelStrategy(options);
  const executor: ForgeWebScriptParallelExecutor | undefined =
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

function resultIterator<TValue>(
  source: ForgeWebScriptIterator<unknown>,
  values: readonly TValue[],
  operation: ForgeWebScriptParallelOperation,
  ownership: ForgeWebScriptCollectionOwnership = source.descriptor.ownership,
): ForgeWebScriptIterator<TValue> {
  const array = createForgeWebScriptArray(values, ownership);
  return forgeWebScriptIteratorFromArray(
    array,
    createForgeWebScriptIteratorDescriptor(
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
export async function forgeWebScriptIteratorParMap<TValue, TResult>(
  source: ForgeWebScriptIterable<TValue>,
  map: (value: TValue, index: number) => TResult | PromiseLike<TResult>,
  options: ForgeWebScriptParallelOptions = {},
): Promise<ForgeWebScriptIterator<TResult>> {
  const iterator = asIterator(source);
  const values = forgeWebScriptIteratorCollect(iterator).values;
  const result = await runIndexed(values, map, options);
  return resultIterator(iterator, result.values, 'par_map');
}

/**
 * Evaluate a predicate in parallel and retain accepted values in source order.
 * This is the canonical `par_filter` API.
 */
export async function forgeWebScriptIteratorParFilter<TValue>(
  source: ForgeWebScriptIterable<TValue>,
  predicate: (value: TValue, index: number) => boolean | PromiseLike<boolean>,
  options: ForgeWebScriptParallelOptions = {},
): Promise<ForgeWebScriptIterator<TValue>> {
  const iterator = asIterator(source);
  const values = forgeWebScriptIteratorCollect(iterator).values;
  const accepted = await runIndexed(values, predicate, options);
  return resultIterator(
    iterator,
    values.filter((_value, index) => accepted.values[index] === true),
    'par_filter',
  );
}

/** Flatten nested sources in parallel while preserving outer and inner order. */
export async function forgeWebScriptIteratorParFlatten<TValue>(
  source: ForgeWebScriptIterable<ForgeWebScriptIterable<TValue>>,
  options: ForgeWebScriptParallelOptions = {},
): Promise<ForgeWebScriptIterator<TValue>> {
  const iterator = asIterator(source);
  const values = forgeWebScriptIteratorCollect(iterator).values;
  const nested = await runIndexed(values, (value) => forgeWebScriptIteratorCollect(asIterator(value)).values, options);
  return resultIterator(iterator, nested.values.flat(), 'par_flatten');
}

async function materializeParallel<TValue>(
  source: ForgeWebScriptIterable<TValue>,
  options: ForgeWebScriptParallelOptions,
): Promise<readonly TValue[]> {
  const iterator = asIterator(source);
  const values = forgeWebScriptIteratorCollect(iterator).values;
  return (await runIndexed(values, (value) => value, options)).values;
}

/** Materialize ordered parallel results into an owned vector. */
export async function forgeWebScriptIteratorParCollect<TValue>(
  source: ForgeWebScriptIterable<TValue>,
  options: ForgeWebScriptParallelOptions = {},
): Promise<ForgeWebScriptVector<TValue>> {
  return createForgeWebScriptVector(await materializeParallel(source, options));
}

/** Materialize ordered parallel results into an owned fixed array. */
export async function forgeWebScriptIteratorParToArray<TValue>(
  source: ForgeWebScriptIterable<TValue>,
  options: ForgeWebScriptParallelOptions = {},
): Promise<ForgeWebScriptArray<TValue>> {
  return createForgeWebScriptArray(await materializeParallel(source, options));
}

/** Fold ordered results left-to-right, including the supplied initial accumulator. */
export async function forgeWebScriptIteratorParFold<TValue, TResult>(
  source: ForgeWebScriptIterable<TValue>,
  initial: TResult,
  reducer: (accumulator: TResult, value: TValue, index: number) => TResult,
  options: ForgeWebScriptParallelOptions = {},
): Promise<TResult> {
  const values = await materializeParallel(source, options);
  let result = initial;
  for (const [index, value] of values.entries()) result = reducer(result, value, index);
  return result;
}

/** Return the first ordered result, or an Option.none value for an empty source. */
export async function forgeWebScriptIteratorParFirst<TValue>(
  source: ForgeWebScriptIterable<TValue>,
  options: ForgeWebScriptParallelOptions = {},
): Promise<ForgeWebScriptOption<TValue>> {
  const values = await materializeParallel(source, options);
  return values.length === 0 ? forgeWebScriptNone() : forgeWebScriptSome(values[0] as TValue);
}

/** Return the last ordered result, or an Option.none value for an empty source. */
export async function forgeWebScriptIteratorParLast<TValue>(
  source: ForgeWebScriptIterable<TValue>,
  options: ForgeWebScriptParallelOptions = {},
): Promise<ForgeWebScriptOption<TValue>> {
  const values = await materializeParallel(source, options);
  return values.length === 0 ? forgeWebScriptNone() : forgeWebScriptSome(values.at(-1) as TValue);
}

/** Return the zero-based ordered result, or Option.none when index is invalid. */
export async function forgeWebScriptIteratorParAt<TValue>(
  source: ForgeWebScriptIterable<TValue>,
  index: number,
  options: ForgeWebScriptParallelOptions = {},
): Promise<ForgeWebScriptOption<TValue>> {
  const values = await materializeParallel(source, options);
  return Number.isInteger(index) && index >= 0 && index < values.length
    ? forgeWebScriptSome(values[index] as TValue)
    : forgeWebScriptNone();
}
