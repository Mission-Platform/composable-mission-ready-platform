import { afterEach, describe, expect, it } from 'vitest';

import { resolvePortalTarget } from './portal-target';

describe('resolvePortalTarget', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns document.body when the trigger is not inside a dialog', () => {
    document.body.innerHTML = '<button id="trigger">Open</button>';
    expect(resolvePortalTarget('trigger')).toBe(document.body);
  });

  it('returns the nearest enclosing dialog when the trigger is nested in one', () => {
    document.body.innerHTML = `
      <dialog id="outer">
        <dialog id="inner">
          <button id="trigger">Open</button>
        </dialog>
      </dialog>
    `;
    const inner = document.querySelector('#inner');
    expect(resolvePortalTarget('trigger')).toBe(inner);
  });

  it('falls back to document.body when the trigger id is missing', () => {
    expect(resolvePortalTarget('missing')).toBe(document.body);
  });

  it('returns the string "body" when document is undefined (SSR)', () => {
    const original = globalThis.document;
    // @ts-expect-error — simulate SSR
    delete globalThis.document;
    try {
      expect(resolvePortalTarget('trigger')).toBe('body');
    } finally {
      globalThis.document = original;
    }
  });
});
