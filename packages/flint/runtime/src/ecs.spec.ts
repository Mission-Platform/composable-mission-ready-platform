import { describe, expect, it } from 'vitest';

import {
  addFlintEcsComponent,
  createFlintEcsScheduler,
  createFlintEcsWorld,
  despawnFlintEcsEntity,
  getFlintEcsComponent,
  queryFlintEcsEntities,
  runFlintEcsScheduler,
  setFlintEcsComponent,
  spawnFlintEcsEntity,
  validateFlintEcsSignals,
} from './ecs.ts';

describe('Forge Web Script ECS runtime', () => {
  it('performs immutable entity/component transitions and rejects stale handles', () => {
    const empty = createFlintEcsWorld<number>();
    const spawned = spawnFlintEcsEntity(empty);
    const withEntity = spawned.transition.next;
    const added = addFlintEcsComponent(withEntity, spawned.entity, 'position', 7);
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(empty.version).toBe(0);
    expect(getFlintEcsComponent(added.transition.next, spawned.entity, 'position')).toBe(7);
    expect(queryFlintEcsEntities(added.transition.next, { required: ['position'], excluded: [] })).toEqual([
      spawned.entity,
    ]);
    const removed = despawnFlintEcsEntity(added.transition.next, spawned.entity);
    expect(removed.ok).toBe(true);
    expect(addFlintEcsComponent(added.transition.next, spawned.entity, 'position', 1)).toMatchObject({
      ok: false,
      code: 'duplicate-component',
    });
    if (!removed.ok) return;
    expect(setFlintEcsComponent(removed.transition.next, spawned.entity, 'position', 8)).toMatchObject({
      ok: false,
      code: 'stale-entity',
    });
  });

  it('detects signal cycles and schedules systems by stable order', () => {
    expect(
      validateFlintEcsSignals([
        { id: 'a', version: 0, dependencies: ['b'] },
        { id: 'b', version: 0, dependencies: ['a'] },
      ]),
    ).toMatchObject({ valid: false });
    const order: string[] = [];
    const scheduler = createFlintEcsScheduler<number>([
      {
        name: 'second',
        order: 2,
        query: { required: [], excluded: [] },
        run: (world) => {
          order.push('second');
          return world;
        },
      },
      {
        name: 'first',
        order: 1,
        query: { required: [], excluded: [] },
        run: (world) => {
          order.push('first');
          return world;
        },
      },
    ]);
    const result = runFlintEcsScheduler(createFlintEcsWorld<number>(), scheduler);
    expect(result).toMatchObject({ ok: true, executedSystems: ['first', 'second'] });
    expect(order).toEqual(['first', 'second']);
  });

  it('batches deterministic signal subscriptions after systems', () => {
    const order: string[] = [];
    const scheduler = createFlintEcsScheduler<number>(
      [],
      [{ id: 'changed', version: 0, dependencies: [], compute: () => true }],
      [
        {
          signal: 'changed',
          subscriber: 'listener',
          order: 1,
          run: (world) => {
            order.push('listener');
            return world;
          },
        },
      ],
    );
    const result = runFlintEcsScheduler(createFlintEcsWorld<number>(), scheduler);
    expect(result).toMatchObject({ ok: true, updatedSignals: [{ id: 'changed', version: 1 }] });
    expect(order).toEqual(['listener']);
  });
});
