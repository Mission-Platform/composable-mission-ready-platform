// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { DomTemplateResult, ForgeElement } from './web-components';

describe('ForgeElement without browser globals', () => {
  it('can be imported and constructed without HTMLElement or document', () => {
    class ServerElement extends ForgeElement {
      static readonly styleUrls = ['./server.css'];
    }

    expect(() => new ServerElement()).not.toThrow();
  });

  it('does not evaluate a DOM-template factory during module import', () => {
    let factoryCalls = 0;
    const result = new DomTemplateResult(
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
});
