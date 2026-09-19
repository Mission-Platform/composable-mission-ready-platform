export interface FlintEcsEntity {
  readonly index: number;
  readonly generation: number;
}

export interface FlintEcsComponentStore<TValue = Uint8Array> {
  readonly component: string;
  readonly version: number;
  readonly values: ReadonlyMap<number, TValue>;
}

export interface FlintEcsWorld<TValue = Uint8Array> {
  readonly version: number;
  readonly nextEntityIndex: number;
  readonly freeEntityIndices: readonly number[];
  readonly generations: ReadonlyMap<number, number>;
  readonly stores: ReadonlyMap<string, FlintEcsComponentStore<TValue>>;
}

export interface FlintEcsQuery {
  readonly required: readonly string[];
  readonly excluded: readonly string[];
}

export interface FlintEcsSystem<TValue = Uint8Array> {
  readonly name: string;
  readonly query: FlintEcsQuery;
  readonly run: (world: FlintEcsWorld<TValue>, entities: readonly FlintEcsEntity[]) => FlintEcsWorld<TValue>;
  readonly order: number;
}

export interface FlintEcsSignal {
  readonly id: string;
  readonly version: number;
  readonly dependencies: readonly string[];
  readonly compute?: <TValue>(world: FlintEcsWorld<TValue>) => boolean;
}

export interface FlintEcsSubscription {
  readonly signal: string;
  readonly subscriber: string;
  readonly order: number;
  readonly run?: <TValue>(world: FlintEcsWorld<TValue>, signal: FlintEcsSignal) => FlintEcsWorld<TValue>;
}

export interface FlintEcsScheduler<TValue = Uint8Array> {
  readonly systems: readonly FlintEcsSystem<TValue>[];
  readonly signals: readonly FlintEcsSignal[];
  readonly subscriptions: readonly FlintEcsSubscription[];
  readonly maxSteps: number;
}

export interface FlintEcsTransition<TValue = Uint8Array> {
  readonly previous: FlintEcsWorld<TValue>;
  readonly next: FlintEcsWorld<TValue>;
  readonly changedEntities: readonly FlintEcsEntity[];
  readonly changedComponents: readonly string[];
}

export type FlintEcsResult<TValue = Uint8Array> =
  | { readonly ok: true; readonly transition: FlintEcsTransition<TValue> }
  | {
      readonly ok: false;
      readonly code: 'duplicate-component' | 'stale-entity' | 'signal-cycle' | 'scheduler-limit';
      readonly message: string;
    };

export interface FlintEcsEntityResult<TValue = Uint8Array> {
  readonly ok: true;
  readonly entity: FlintEcsEntity;
  readonly transition: FlintEcsTransition<TValue>;
}

export interface FlintEcsScheduleResult<TValue = Uint8Array> {
  readonly ok: true;
  readonly world: FlintEcsWorld<TValue>;
  readonly transitions: readonly FlintEcsTransition<TValue>[];
  readonly executedSystems: readonly string[];
  readonly updatedSignals: readonly FlintEcsSignal[];
}

type MutableFlintEcsWorld<TValue> = {
  -readonly [Property in keyof FlintEcsWorld<TValue>]: FlintEcsWorld<TValue>[Property] extends ReadonlyMap<
    infer TKey,
    infer TValueEntry
  >
    ? Map<TKey, TValueEntry>
    : FlintEcsWorld<TValue>[Property] extends readonly (infer TEntry)[]
      ? TEntry[]
      : FlintEcsWorld<TValue>[Property];
};

type FlintEcsFailure = {
  readonly ok: false;
  readonly code: 'duplicate-component' | 'stale-entity' | 'signal-cycle' | 'scheduler-limit';
  readonly message: string;
};

const entityKey = (entity: FlintEcsEntity): string => `${entity.index}:${entity.generation}`;

const sortedNumbers = (values: Iterable<number>): readonly number[] =>
  [...new Set(values)].toSorted((left, right) => left - right);

function copyWorld<TValue>(world: FlintEcsWorld<TValue>): MutableFlintEcsWorld<TValue> {
  return {
    version: world.version + 1,
    nextEntityIndex: world.nextEntityIndex,
    freeEntityIndices: [...world.freeEntityIndices],
    generations: new Map(world.generations),
    stores: new Map(
      [...world.stores].map(([name, store]) => [
        name,
        { component: store.component, version: store.version, values: new Map(store.values) },
      ]),
    ),
  };
}

function transition<TValue>(
  previous: FlintEcsWorld<TValue>,
  next: FlintEcsWorld<TValue>,
  entities: readonly FlintEcsEntity[],
  components: readonly string[],
): FlintEcsTransition<TValue> {
  return {
    previous,
    next,
    changedEntities: [...new Map(entities.map((entity) => [entityKey(entity), entity])).values()].toSorted(
      (left, right) => left.index - right.index,
    ),
    changedComponents: [...new Set(components)].toSorted(),
  };
}

function failure(code: FlintEcsFailure['code'], message: string): FlintEcsFailure {
  return { ok: false, code, message };
}

export function createFlintEcsWorld<TValue = Uint8Array>(): FlintEcsWorld<TValue> {
  return {
    version: 0,
    nextEntityIndex: 0,
    freeEntityIndices: [],
    generations: new Map(),
    stores: new Map(),
  };
}

export function isFlintEcsEntityAlive<TValue>(world: FlintEcsWorld<TValue>, entity: FlintEcsEntity): boolean {
  return world.generations.get(entity.index) === entity.generation && !world.freeEntityIndices.includes(entity.index);
}

export function spawnFlintEcsEntity<TValue = Uint8Array>(world: FlintEcsWorld<TValue>): FlintEcsEntityResult<TValue> {
  const next = copyWorld(world);
  const reusableIndex = next.freeEntityIndices[0];
  const index = reusableIndex ?? next.nextEntityIndex;
  if (reusableIndex === undefined) next.nextEntityIndex += 1;
  else next.freeEntityIndices = next.freeEntityIndices.slice(1);
  const generation = next.generations.get(index) ?? 0;
  const entity = { index, generation };
  next.generations.set(index, generation);
  return { ok: true, entity, transition: transition(world, next, [entity], []) };
}

export function despawnFlintEcsEntity<TValue>(
  world: FlintEcsWorld<TValue>,
  entity: FlintEcsEntity,
): FlintEcsResult<TValue> {
  if (!isFlintEcsEntityAlive(world, entity)) return failure('stale-entity', `Entity ${entityKey(entity)} is stale.`);
  const next = copyWorld(world);
  next.freeEntityIndices = [...sortedNumbers([...next.freeEntityIndices, entity.index])];
  next.generations.set(entity.index, entity.generation + 1);
  const changedComponents: string[] = [];
  for (const [name, store] of next.stores) {
    if (store.values.has(entity.index)) {
      const values = new Map(store.values);
      values.delete(entity.index);
      next.stores.set(name, { component: name, version: store.version + 1, values });
      changedComponents.push(name);
    }
  }
  return { ok: true, transition: transition(world, next, [entity], changedComponents) };
}

export function addFlintEcsComponent<TValue>(
  world: FlintEcsWorld<TValue>,
  entity: FlintEcsEntity,
  component: string,
  value: TValue,
): FlintEcsResult<TValue> {
  if (!isFlintEcsEntityAlive(world, entity)) return failure('stale-entity', `Entity ${entityKey(entity)} is stale.`);
  const existing = world.stores.get(component);
  if (existing?.values.has(entity.index))
    return failure('duplicate-component', `Entity already has component '${component}'.`);
  const next = copyWorld(world);
  const values = new Map(existing?.values);
  values.set(entity.index, value);
  next.stores.set(component, { component, version: (existing?.version ?? 0) + 1, values });
  return { ok: true, transition: transition(world, next, [entity], [component]) };
}

export function setFlintEcsComponent<TValue>(
  world: FlintEcsWorld<TValue>,
  entity: FlintEcsEntity,
  component: string,
  value: TValue,
): FlintEcsResult<TValue> {
  if (!isFlintEcsEntityAlive(world, entity)) return failure('stale-entity', `Entity ${entityKey(entity)} is stale.`);
  const existing = world.stores.get(component);
  const next = copyWorld(world);
  const values = new Map(existing?.values);
  values.set(entity.index, value);
  next.stores.set(component, { component, version: (existing?.version ?? 0) + 1, values });
  return { ok: true, transition: transition(world, next, [entity], [component]) };
}

export function removeFlintEcsComponent<TValue>(
  world: FlintEcsWorld<TValue>,
  entity: FlintEcsEntity,
  component: string,
): FlintEcsResult<TValue> {
  if (!isFlintEcsEntityAlive(world, entity)) return failure('stale-entity', `Entity ${entityKey(entity)} is stale.`);
  const existing = world.stores.get(component);
  if (existing === undefined || !existing.values.has(entity.index))
    return { ok: true, transition: transition(world, world, [], []) };
  const next = copyWorld(world);
  const values = new Map(existing.values);
  values.delete(entity.index);
  next.stores.set(component, { component, version: existing.version + 1, values });
  return { ok: true, transition: transition(world, next, [entity], [component]) };
}

export function getFlintEcsComponent<TValue>(
  world: FlintEcsWorld<TValue>,
  entity: FlintEcsEntity,
  component: string,
): TValue | undefined {
  if (!isFlintEcsEntityAlive(world, entity)) return undefined;
  return world.stores.get(component)?.values.get(entity.index);
}

export function queryFlintEcsEntities<TValue>(
  world: FlintEcsWorld<TValue>,
  query: FlintEcsQuery,
): readonly FlintEcsEntity[] {
  const requiredStores = query.required.map((component) => world.stores.get(component));
  if (requiredStores.includes(undefined)) return [];
  const candidates = requiredStores[0]?.values.keys() ?? [...world.generations.keys()];
  return [...candidates]
    .filter((index) => !query.excluded.some((component) => world.stores.get(component)?.values.has(index)))
    .filter((index) => requiredStores.every((store) => store?.values.has(index)))
    .map((index) => ({ index, generation: world.generations.get(index) ?? 0 }))
    .filter((entity) => isFlintEcsEntityAlive(world, entity))
    .toSorted((left, right) => left.index - right.index);
}

export function validateFlintEcsSignals(
  signals: readonly FlintEcsSignal[],
): { readonly valid: true } | { readonly valid: false; readonly cycle: readonly string[] } {
  const dependencies = new Map(signals.map((signal) => [signal.id, signal.dependencies]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const walk = (id: string, path: readonly string[]): readonly string[] | undefined => {
    if (visiting.has(id)) return [...path, id];
    if (visited.has(id)) return undefined;
    visiting.add(id);
    for (const dependency of dependencies.get(id) ?? []) {
      const cycle = walk(dependency, [...path, id]);
      if (cycle !== undefined) return cycle;
    }
    visiting.delete(id);
    visited.add(id);
    return undefined;
  };
  for (const signal of signals) {
    const cycle = walk(signal.id, []);
    if (cycle !== undefined) return { valid: false, cycle };
  }
  return { valid: true };
}

export function createFlintEcsScheduler<TValue = Uint8Array>(
  systems: readonly FlintEcsSystem<TValue>[],
  signals: readonly FlintEcsSignal[] = [],
  subscriptions: readonly FlintEcsSubscription[] = [],
  maxSteps = 1000,
): FlintEcsScheduler<TValue> {
  return {
    systems: [...systems].toSorted((left, right) => left.order - right.order || left.name.localeCompare(right.name)),
    signals: [...signals].toSorted((left, right) => left.id.localeCompare(right.id)),
    subscriptions: [...subscriptions].toSorted(
      (left, right) => left.order - right.order || left.subscriber.localeCompare(right.subscriber),
    ),
    maxSteps,
  };
}

export function runFlintEcsScheduler<TValue>(
  world: FlintEcsWorld<TValue>,
  scheduler: FlintEcsScheduler<TValue>,
): FlintEcsScheduleResult<TValue> | Extract<FlintEcsResult<TValue>, { readonly ok: false }> {
  const signalValidation = validateFlintEcsSignals(scheduler.signals);
  if (!signalValidation.valid)
    return failure('signal-cycle', `Signal dependency cycle: ${signalValidation.cycle.join(' -> ')}.`);
  if (scheduler.systems.length + scheduler.subscriptions.length > scheduler.maxSteps)
    return failure('scheduler-limit', 'The deterministic scheduler step limit was exceeded.');
  let current = world;
  const transitions: FlintEcsTransition<TValue>[] = [];
  const executedSystems: string[] = [];
  for (const system of scheduler.systems) {
    const entities = queryFlintEcsEntities(current, system.query);
    const next = system.run(current, entities);
    if (next !== current) transitions.push(transition(current, next, entities, system.query.required));
    current = next;
    executedSystems.push(system.name);
  }
  const updatedSignals = scheduler.signals.map((signal) => ({
    ...signal,
    version: signal.compute?.(current) === true ? signal.version + 1 : signal.version,
  }));
  for (const subscription of scheduler.subscriptions) {
    const signal = updatedSignals.find((candidate) => candidate.id === subscription.signal);
    if (signal === undefined || subscription.run === undefined) continue;
    const next = subscription.run(current, signal);
    if (next !== current) transitions.push(transition(current, next, [], signal.dependencies));
    current = next;
  }
  return { ok: true, world: current, transitions, executedSystems, updatedSignals };
}
