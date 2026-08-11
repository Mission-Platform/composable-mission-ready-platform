import type { IconSymbolDefinition } from './types';

export const ICON_COMPOSITIONS: readonly IconSymbolDefinition[] = [
  {
    id: 'icon-route-waypoint',
    viewBox: '0 0 24 24',
    category: 'routing',
    subcategory: 'directions',
    nodes: [],
    uses: [{ symbolId: 'icon-route' }, { symbolId: 'icon-waypoint', transform: 'translate(2 -2) scale(.6)' }],
  },
];

export function validateCompositions(
  compositions: readonly IconSymbolDefinition[],
  availableIds: ReadonlySet<string>,
): void {
  const compositionIds = new Set(compositions.map((composition) => composition.id));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  for (const composition of compositions) {
    visit(composition.id, composition);
  }

  function visit(id: string, definition: IconSymbolDefinition): void {
    if (visiting.has(id)) {
      throw new Error(`[icons] Composition cycle detected at ${id}`);
    }
    if (visited.has(id)) {
      return;
    }
    visiting.add(id);
    for (const use of definition.uses ?? []) {
      if (!availableIds.has(use.symbolId) && !compositionIds.has(use.symbolId)) {
        throw new Error(`[icons] Composition ${id} references missing symbol ${use.symbolId}`);
      }
      const dependency = compositions.find((candidate) => candidate.id === use.symbolId);
      if (dependency) {
        visit(dependency.id, dependency);
      }
    }
    visiting.delete(id);
    visited.add(id);
  }
}
