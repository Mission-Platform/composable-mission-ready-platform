import { describe, expect, it } from 'vitest';

import { validateCompositions } from './compositions';
import { ICON_SYMBOL_DEFINITIONS } from './definitions';
import { serializeNode, serializeSprite, serializeSymbol } from './serialize';

describe('icon sprite serialization', () => {
  it('serializes nested SVG nodes and escapes attributes', () => {
    expect(
      serializeNode({
        element: 'g',
        attributes: { 'data-label': '<safe>' },
        children: [{ element: 'path', attributes: { d: 'M0 0' } }],
      }),
    ).toBe('<g data-label="&lt;safe&gt;"><path d="M0 0"></path></g>');
  });

  it('serializes composition references without copying source geometry', () => {
    expect(
      serializeSymbol({
        id: 'icon-composite',
        viewBox: '0 0 24 24',
        category: 'objects',
        subcategory: 'system',
        nodes: [],
        uses: [{ symbolId: 'icon-arrow', transform: 'rotate(90 12 12)' }],
      }),
    ).toContain('<use href="#icon-arrow" transform="rotate(90 12 12)" />');
  });

  it('emits one deterministic symbol id for each catalog definition', () => {
    const sprite = serializeSprite(ICON_SYMBOL_DEFINITIONS);
    const ids = [...sprite.matchAll(/<symbol id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids.length).toBe(new Set(ids).size);
    expect(ids).toContain('icon-flag-US');
    expect(ids).toContain('icon-route');
    expect(ids).toContain('icon-country-globe-US');
  });

  it('does not replace catalog artwork with the generic fallback circle', () => {
    const fallback = '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"></circle>';

    const fallbackSymbols = ICON_SYMBOL_DEFINITIONS.filter((definition) =>
      serializeSymbol(definition).includes(fallback),
    );

    expect(fallbackSymbols).toEqual([]);
  });

  it('rejects missing composition references and cycles', () => {
    expect(() =>
      validateCompositions(
        [
          {
            id: 'icon-missing-reference',
            viewBox: '0 0 24 24',
            category: 'objects',
            subcategory: 'system',
            nodes: [],
            uses: [{ symbolId: 'icon-nope' }],
          },
        ],
        new Set(),
      ),
    ).toThrow('references missing symbol');
    const cyclic = [
      {
        id: 'icon-cycle-a',
        viewBox: '0 0 24 24',
        category: 'objects',
        subcategory: 'system',
        nodes: [],
        uses: [{ symbolId: 'icon-cycle-b' }],
      },
      {
        id: 'icon-cycle-b',
        viewBox: '0 0 24 24',
        category: 'objects',
        subcategory: 'system',
        nodes: [],
        uses: [{ symbolId: 'icon-cycle-a' }],
      },
    ];
    expect(() => validateCompositions(cyclic, new Set())).toThrow('Composition cycle detected');
  });
});
