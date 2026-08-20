import { describe, expect, it } from 'vitest';

import {
  addForgeWebScriptEcsComponent,
  createForgeWebScriptEcsScheduler,
  createForgeWebScriptEcsWorld,
  despawnForgeWebScriptEcsEntity,
  getForgeWebScriptEcsComponent,
  queryForgeWebScriptEcsEntities,
  runForgeWebScriptEcsScheduler,
  setForgeWebScriptEcsComponent,
  spawnForgeWebScriptEcsEntity,
  validateForgeWebScriptEcsSignals,
} from './ecs.ts';

describe('Forge Web Script ECS runtime', () => {
  it('performs immutable entity/component transitions and rejects stale handles', () => {
    const empty = createForgeWebScriptEcsWorld<number>();
    const spawned = spawnForgeWebScriptEcsEntity(empty);
    const withEntity = spawned.transition.next;
    const added = addForgeWebScriptEcsComponent(withEntity, spawned.entity, 'position', 7);
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(empty.version).toBe(0);
    expect(getForgeWebScriptEcsComponent(added.transition.next, spawned.entity, 'position')).toBe(7);
    expect(queryForgeWebScriptEcsEntities(added.transition.next, { required: ['position'], excluded: [] })).toEqual([
      spawned.entity,
    ]);
    const removed = despawnForgeWebScriptEcsEntity(added.transition.next, spawned.entity);
    expect(removed.ok).toBe(true);
    expect(addForgeWebScriptEcsComponent(added.transition.next, spawned.entity, 'position', 1)).toMatchObject({
      ok: false,
      code: 'duplicate-component',
    });
    if (!removed.ok) return;
    expect(setForgeWebScriptEcsComponent(removed.transition.next, spawned.entity, 'position', 8)).toMatchObject({
      ok: false,
      code: 'stale-entity',
    });
  });

  it('detects signal cycles and schedules systems by stable order', () => {
    expect(
      validateForgeWebScriptEcsSignals([
        { id: 'a', version: 0, dependencies: ['b'] },
        { id: 'b', version: 0, dependencies: ['a'] },
      ]),
    ).toMatchObject({ valid: false });
    const order: string[] = [];
    const scheduler = createForgeWebScriptEcsScheduler<number>([
      { name: 'second', order: 2, query: { required: [], excluded: [] }, run: (world) => { order.push('second'); return world; } },
      { name: 'first', order: 1, query: { required: [], excluded: [] }, run: (world) => { order.push('first'); return world; } },
    ]);
    const result = runForgeWebScriptEcsScheduler(createForgeWebScriptEcsWorld<number>(), scheduler);
    expect(result).toMatchObject({ ok: true, executedSystems: ['first', 'second'] });
    expect(order).toEqual(['first', 'second']);
  });

  it('batches deterministic signal subscriptions after systems', () => {
    const order: string[] = [];
    const scheduler = createForgeWebScriptEcsScheduler<number>(
      [],
      [{ id: 'changed', version: 0, dependencies: [], compute: () => true }],
      [{
        signal: 'changed',
        subscriber: 'listener',
        order: 1,
        run: (world) => {
          order.push('listener');
          return world;
        },
      }],
    );
    const result = runForgeWebScriptEcsScheduler(createForgeWebScriptEcsWorld<number>(), scheduler);
    expect(result).toMatchObject({ ok: true, updatedSignals: [{ id: 'changed', version: 1 }] });
    expect(order).toEqual(['listener']);
  });
});