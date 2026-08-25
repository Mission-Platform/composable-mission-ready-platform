import type { ForgeWebScriptWasmStandardLibraryOperation } from './contracts.js';

export interface ForgeWebScriptWasmRuntimeBody {
  readonly name: string;
  readonly operation: ForgeWebScriptWasmStandardLibraryOperation;
  readonly parameters: readonly string[];
  readonly results: readonly string[];
  readonly deterministic: true;
  readonly capability?: 'scheduler.microtask' | 'scheduler.worker';
}

const get = (index: number): number[] => [0x20, index];
const set = (index: number): number[] => [0x21, index];
const constant = (value: number): number[] => [0x41, value];
const signedLeb = (value: bigint): number[] => {
  const bytes: number[] = [];
  let remaining = value;
  let more = true;
  while (more) {
    const byte = Number(remaining & 0x7fn);
    remaining >>= 7n;
    more = !((remaining === 0n && (byte & 0x40) === 0) || (remaining === -1n && (byte & 0x40) !== 0));
    bytes.push(more ? byte | 0x80 : byte);
  }
  return bytes;
};
const load = (offset: number): number[] => [0x28, 0x02, offset];
const store = (offset: number): number[] => [0x36, 0x02, offset];
function unsignedLeb(value: number): number[] {
  const result: number[] = [];
  let remaining = value >>> 0;
  do {
    const byte = remaining & 0x7f;
    remaining >>>= 7;
    result.push(remaining === 0 ? byte : byte | 0x80);
  } while (remaining !== 0);
  return result;
}

const call = (index: number): number[] => [0x10, ...unsignedLeb(index)];
const memoryCopy = (): number[] => [0xfc, 0x0a, 0x00, 0x00];
const localBody = (count: number, instructions: readonly number[]): number[] => [
  count === 0 ? 0 : 1,
  ...(count === 0 ? [] : [count, 0x7f]),
  ...instructions,
  0x0b,
];

function boundsCheck(handle: number, index: number, lengthOffset: number): number[] {
  return [...get(handle), ...load(lengthOffset), ...get(index), 0x4d, 0x04, 0x40, 0x00, 0x0b];
}

/**
 * Runtime bodies use i32 handles. Arrays are [length, elements...] and vectors
 * are [data-pointer, length, capacity], with four-byte scalar element slots.
 * Array iterators are [array-handle, next-index]. Iterator results use the
 * packed i64 `(done << 32) | i32 value` ABI.
 */
export function buildForgeWebScriptWasmCollectionRuntimeWasmBodies(allocatorIndex: number): readonly number[][] {
  const arrayNew = localBody(1, [
    ...get(0),
    ...constant(4),
    0x6c,
    ...constant(4),
    0x6a,
    ...call(allocatorIndex),
    ...set(1),
    ...get(1),
    ...get(0),
    ...store(0),
    ...get(1),
  ]);
  const arrayGet = localBody(0, [
    ...boundsCheck(0, 1, 0),
    ...get(0),
    ...constant(4),
    0x6a,
    ...get(1),
    ...constant(4),
    0x6c,
    0x6a,
    ...load(0),
  ]);
  const arraySet = localBody(0, [
    ...boundsCheck(0, 1, 0),
    ...get(0),
    ...constant(4),
    0x6a,
    ...get(1),
    ...constant(4),
    0x6c,
    0x6a,
    ...get(2),
    ...store(0),
  ]);
  const arrayLength = localBody(0, [...get(0), ...load(0)]);
  const arrayIter = localBody(1, [
    ...constant(8),
    ...call(allocatorIndex),
    ...set(1),
    ...get(1),
    ...get(0),
    ...store(0),
    ...get(1),
    ...constant(0),
    ...store(4),
    ...get(1),
  ]);
  const iteratorNext = localBody(2, [
    ...get(0),
    ...load(0),
    ...set(1),
    ...get(0),
    ...load(4),
    ...set(2),
    ...get(1),
    ...load(0),
    ...get(2),
    // Continue while index < length; otherwise return the packed done marker.
    0x4b,
    0x04,
    0x7e,
    ...get(1),
    ...get(2),
    ...constant(4),
    0x6c,
    0x6a,
    ...constant(4),
    0x6a,
    ...load(0),
    0xac,
    0x42,
    ...signedLeb(0n),
    0x42,
    ...signedLeb(32n),
    0x86,
    0x84,
    ...get(0),
    ...get(2),
    ...constant(1),
    0x6a,
    ...store(4),
    0x05,
    0x42,
    ...signedLeb(4_294_967_296n),
    0x0b,
  ]);
  const vectorNew = localBody(2, [
    ...get(0),
    ...constant(4),
    0x6c,
    ...constant(12),
    0x6a,
    ...call(allocatorIndex),
    ...set(1),
    ...get(1),
    ...constant(12),
    0x6a,
    ...set(2),
    ...get(1),
    ...get(2),
    ...store(0),
    ...get(1),
    ...constant(0),
    ...store(4),
    ...get(1),
    ...get(0),
    ...store(8),
    ...get(1),
  ]);
  const vectorGet = localBody(0, [
    ...boundsCheck(0, 1, 4),
    ...get(0),
    ...load(0),
    ...get(1),
    ...constant(4),
    0x6c,
    0x6a,
    ...load(0),
  ]);
  const vectorSet = localBody(0, [
    ...boundsCheck(0, 1, 4),
    ...get(0),
    ...load(0),
    ...get(1),
    ...constant(4),
    0x6c,
    0x6a,
    ...get(2),
    ...store(0),
  ]);
  const vectorLength = localBody(0, [...get(0), ...load(4)]);
  const vectorPop = localBody(2, [
    ...get(0),
    ...load(4),
    ...set(1),
    ...get(1),
    0x45,
    0x04,
    0x40,
    0x00,
    0x0b,
    ...get(1),
    ...constant(1),
    0x6b,
    ...set(2),
    ...get(0),
    ...load(0),
    ...get(2),
    ...constant(4),
    0x6c,
    0x6a,
    ...load(0),
    ...set(1),
    ...get(0),
    ...get(2),
    ...store(4),
    ...get(1),
  ]);
  const vectorPush = localBody(5, [
    ...get(0),
    ...load(4),
    ...set(2),
    ...get(0),
    ...load(8),
    ...set(3),
    ...get(2),
    ...get(3),
    0x4e,
    0x04,
    0x40,
    ...get(3),
    ...constant(2),
    0x6c,
    ...get(3),
    0x45,
    0x6a,
    ...set(5),
    ...get(5),
    ...constant(4),
    0x6c,
    ...call(allocatorIndex),
    ...set(6),
    ...get(0),
    ...load(0),
    ...set(4),
    ...get(6),
    ...get(4),
    ...get(2),
    ...constant(4),
    0x6c,
    ...memoryCopy(),
    0x0b,
    ...get(0),
    ...get(6),
    ...store(0),
    ...get(0),
    ...get(5),
    ...store(8),
    ...get(0),
    ...load(0),
    ...get(2),
    ...constant(4),
    0x6c,
    0x6a,
    ...get(1),
    ...store(0),
    ...get(2),
    ...constant(1),
    0x6a,
    ...set(2),
    ...get(0),
    ...get(2),
    ...store(4),
    ...get(0),
  ]);
  return [
    arrayNew,
    arrayGet,
    arraySet,
    arrayLength,
    arrayIter,
    vectorNew,
    vectorPush,
    vectorGet,
    vectorSet,
    vectorLength,
    vectorPop,
    iteratorNext,
  ];
}

const collectionOperations: readonly ForgeWebScriptWasmRuntimeBody[] = [
  { name: 'fws_array_new', operation: 'array-new', parameters: ['i32'], results: ['i32'], deterministic: true },
  { name: 'fws_array_get', operation: 'array-get', parameters: ['i32', 'i32'], results: ['i32'], deterministic: true },
  {
    name: 'fws_array_set',
    operation: 'array-set',
    parameters: ['i32', 'i32', 'i32'],
    results: [],
    deterministic: true,
  },
  { name: 'fws_array_length', operation: 'array-length', parameters: ['i32'], results: ['i32'], deterministic: true },
  { name: 'fws_array_iter', operation: 'array-iter', parameters: ['i32'], results: ['i32'], deterministic: true },
  { name: 'fws_vector_new', operation: 'vector-new', parameters: ['i32'], results: ['i32'], deterministic: true },
  {
    name: 'fws_vector_push',
    operation: 'vector-push',
    parameters: ['i32', 'i32'],
    results: ['i32'],
    deterministic: true,
  },
  {
    name: 'fws_vector_get',
    operation: 'vector-get',
    parameters: ['i32', 'i32'],
    results: ['i32'],
    deterministic: true,
  },
  {
    name: 'fws_vector_set',
    operation: 'vector-set',
    parameters: ['i32', 'i32', 'i32'],
    results: [],
    deterministic: true,
  },
  { name: 'fws_vector_length', operation: 'vector-length', parameters: ['i32'], results: ['i32'], deterministic: true },
  { name: 'fws_vector_pop', operation: 'vector-pop', parameters: ['i32'], results: ['i32'], deterministic: true },
  { name: 'fws_iterator_next', operation: 'iterator-next', parameters: ['i32'], results: ['i64'], deterministic: true },
  { name: 'fws_set_has', operation: 'set-has', parameters: ['i32', 'i32'], results: ['i32'], deterministic: true },
  { name: 'fws_map_get', operation: 'map-get', parameters: ['i32', 'i32'], results: ['i32'], deterministic: true },
  { name: 'fws_ecs_query', operation: 'ecs-query', parameters: ['i32', 'i32'], results: ['i32'], deterministic: true },
  {
    name: 'fws_ecs_transition',
    operation: 'ecs-transition',
    parameters: ['i32', 'i32'],
    results: ['i32'],
    deterministic: true,
  },
  {
    name: 'fws_signal_schedule',
    operation: 'signal-schedule',
    parameters: ['i32'],
    results: ['i32'],
    deterministic: true,
  },
  {
    name: 'fws_async_schedule_microtask',
    operation: 'async-schedule-microtask',
    parameters: ['i32', 'i32'],
    results: ['i32'],
    deterministic: true,
    capability: 'scheduler.microtask',
  },
  {
    name: 'fws_async_worker_post',
    operation: 'async-worker-post',
    parameters: ['i32', 'i32'],
    results: ['i32'],
    deterministic: true,
    capability: 'scheduler.worker',
  },
  {
    name: 'fws_async_worker_receive',
    operation: 'async-worker-receive',
    parameters: ['i32', 'i32'],
    results: ['i32'],
    deterministic: true,
    capability: 'scheduler.microtask',
  },
];

export function buildForgeWebScriptWasmCollectionRuntimeBodies(): readonly ForgeWebScriptWasmRuntimeBody[] {
  return collectionOperations;
}
