// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { domTemplate, dynamicElement, ForgeElement } from './web-components';

import type { DomRenderResult } from './web-components';

describe('ForgeElement without browser globals', () => {
  it('can be imported and constructed without HTMLElement or document', () => {
    class ServerElement extends ForgeElement {
      static readonly styleUrls = ['./server.css'];
    }

    expect(() => new ServerElement()).not.toThrow();
  });

  it('does not evaluate a DOM-template factory during module import', () => {
    let factoryCalls = 0;
    const result = domTemplate(
      {
        create: () => {
          factoryCalls += 1;
          throw new Error('browser-only factory should be deferred');
        },
      },
      [],
    );

    expect(result.values).toEqual([]);
    expect(factoryCalls).toBe(0);
  });

  it('uses the unified discriminated contract for dynamic and template results', () => {
    const dynamic: DomRenderResult = dynamicElement('div', {}, 'content');
    const template: DomRenderResult = domTemplate({ create: () => ({ nodes: [], parts: [] }) }, []);

    expect(dynamic.kind).toBe('dynamic');
    expect(template.kind).toBe('template');
  });
});
