// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { DynamicSlotElement, MaterializingSlotElement, FallbackSlotElement, tick } from './web-components-fixtures.js';
import { ForgeElement, ForgeElementMixin, hasSlotContent, html } from './web-components.js';

import type { TemplateResult } from './web-components.js';

afterEach(() => {
  document.body.replaceChildren();
});

describe('runtime Web-Components slot projection', () => {
  it('resolves dynamic named content from the original light DOM and updates conditionally', async () => {
    const element = document.createElement('mp-dynamic-slot-test') as DynamicSlotElement;
    const defaultContent = document.createElement('strong');
    defaultContent.textContent = 'default';
    const endContent = document.createElement('a');
    endContent.slot = 'end';
    endContent.textContent = 'end';
    element.append(defaultContent, endContent);
    document.body.append(element);
    await tick();

    element.slotName = 'end';
    await tick();

    const endSlot = element.shadowRoot?.querySelector('slot');
    expect(
      endSlot
        ?.assignedNodes()
        .map((node) => node.textContent)
        .join(''),
    ).toContain('end');
    expect(
      endSlot
        ?.assignedNodes()
        .map((node) => node.textContent)
        .join(''),
    ).not.toContain('default');
    expect(endContent.parentNode).toBe(element);

    element.slotName = 'missing';
    await tick();
    expect(element.shadowRoot?.querySelector('slot')).toBeNull();

    element.slotName = 'end';
    await tick();

    element.enabled = false;
    await tick();
    expect(element.shadowRoot?.querySelector('slot')).toBeNull();

    element.enabled = true;
    await tick();
    expect(element.shadowRoot?.querySelector('slot')?.assignedNodes()[0]).toBe(endContent);
  });

  it('keeps fallback children on native runtime outlets', async () => {
    const element = document.createElement('mp-fallback-slot-test') as FallbackSlotElement;
    document.body.append(element);
    await tick();

    const slot = element.shadowRoot?.querySelector('slot');
    expect(slot?.assignedNodes()).toHaveLength(0);
    expect(slot?.textContent).toBe('fallback');
  });

  it('does not assign the same materialized node to repeated outlets', async () => {
    const element = document.createElement('mp-dynamic-slot-test') as DynamicSlotElement;
    const content = document.createElement('span');
    content.textContent = 'once';
    element.append(content);
    document.body.append(element);
    await tick();

    const slot = element.shadowRoot?.querySelector('slot');
    expect(slot?.assignedNodes()[0]).toBe(content);
    expect(content.parentNode).toBe(element);
  });

  it('propagates projection-owner styles once when materializing across roots', async () => {
    const element = document.createElement('mp-styled-materializing-owner-test');
    const content = document.createElement('span');
    content.textContent = 'content';
    element.append(content);
    document.body.append(element);
    await tick();

    const child = element.shadowRoot?.querySelector('mp-materializing-slot-test') as MaterializingSlotElement;
    expect(child.shadowRoot?.textContent).toContain('content');
    expect(child.shadowRoot?.querySelectorAll('link[data-mp-forge-style]')).toHaveLength(1);
    expect(child.shadowRoot?.querySelectorAll('.extra')).toHaveLength(2);
    expect(child.shadowRoot?.querySelectorAll('forge-slot')).toHaveLength(0);
    child.requestUpdate();
    await tick();
    expect(child.shadowRoot?.textContent).toContain('content');
    expect(child.shadowRoot?.querySelectorAll('link[data-mp-forge-style]')).toHaveLength(1);
    expect(child.shadowRoot?.querySelectorAll('.extra')).toHaveLength(2);
  });
});

/**
 * A generated-style element whose reactive `state` is seeded the way the
 * Web-Components emitter does it: declaration-only, assigned in the constructor.
 */
class SeededElement extends ForgeElement {
  static readonly properties = { count: { state: true } };

  declare count: number;
  renderCount = 0;

  constructor() {
    super();
    this.count = 0;
  }

  render(): TemplateResult {
    this.renderCount += 1;
    return html`
      <span class="value">${this.count}</span>
    `;
  }
}
customElements.define('mp-seeded', SeededElement);

/**
 * The same element with its `count` seeded as an **own** property — what a class
 * field initializer (`count = 0`) compiles to under `useDefineForClassFields`.
 * It exists to pin down *why* the emitter declares reactive fields instead of
 * initialising them.
 */
class ShadowedElement extends ForgeElement {
  static readonly properties = { count: { state: true } };

  declare count: number;

  constructor() {
    super();
    Object.defineProperty(this, 'count', { configurable: true, enumerable: true, value: 0, writable: true });
  }

  render(): TemplateResult {
    const value = this.count;
    return html`
      <span class="value">${value}</span>
    `;
  }
}
customElements.define('mp-shadowed', ShadowedElement);

/**
 * An element whose state cell is seeded **from a property**, the way the
 * compiler emits `const [value] = useState(Number(modelValue) * 2)`: the seed
 * cannot run in the constructor, where `modelValue` is still `undefined`, so it
 * is deferred to {@link ForgeElement.setup}.
 */
class DeferredSeedElement extends ForgeElement {
  static readonly properties = { modelValue: {}, doubled: { state: true } };

  declare modelValue: string | undefined;

  declare doubled: number;
  renderCount = 0;

  setup(): void {
    const { modelValue = '0' } = this;
    this.doubled = Number(modelValue) * 2;
  }

  render(): TemplateResult {
    this.renderCount += 1;
    return html`
      <span class="value">${this.doubled}</span>
    `;
  }
}
customElements.define('mp-deferred-seed', DeferredSeedElement);

describe('reactive state seeding', () => {
  it('does not repeat the initial render after constructor state seeding', async () => {
    const element = new SeededElement();
    document.body.append(element);
    await tick();

    expect(element.renderCount).toBe(1);
  });

  it('re-renders when state seeded in the constructor is written', async () => {
    const element = new SeededElement();
    document.body.append(element);
    expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('0');

    element.count = 3;
    await tick();

    expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('3');
    // The value lives in the runtime's store, not on the instance.
    expect(Object.prototype.hasOwnProperty.call(element, 'count')).toBe(false);
  });

  it('never re-renders when an own property shadows the reactive accessor', async () => {
    const element = new ShadowedElement();
    document.body.append(element);

    element.count = 3;
    await tick();

    // The write hit the own data property, so the setter — and the re-render it
    // schedules — never ran. This is the hazard a `declare`d field avoids.
    expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('0');
  });

  it('seeds state from a property set as an attribute before the first render', async () => {
    const element = document.createElement('mp-deferred-seed') as DeferredSeedElement;
    element.setAttribute('modelvalue', '21');
    document.body.append(element);

    // `setup` runs after `adoptAttributes`, so the seed reads the real value —
    // in the constructor it would have read `undefined` and fallen back to `0`.
    expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('42');
    await tick();
    expect(element.renderCount).toBe(1);
  });

  it('seeds exactly once, so a reconnect keeps what the user has since changed', () => {
    const element = document.createElement('mp-deferred-seed');
    element.setAttribute('modelvalue', '1');
    document.body.append(element);
    element.remove();
    document.body.append(element);

    expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('2');
    expect((element as DeferredSeedElement).doubled).toBe(2);
  });
});

describe('platform host policies and internals', () => {
  it('keeps a closed shadow root available to the renderer', () => {
    class ClosedElement extends ForgeElement {
      static readonly shadow = { mode: 'closed' as const };

      render(): TemplateResult {
        return html`
          <span>closed content</span>
        `;
      }
    }
    customElements.define('mp-closed-policy', ClosedElement);

    const element = new ClosedElement();
    document.body.append(element);

    expect(element.shadowRoot).toBeNull();
    expect(element.forgeRenderRoot?.textContent).toContain('closed content');
  });

  it('retries shadow attachment when optional fields are unsupported', () => {
    const attempts: ShadowRootInit[] = [];
    class OptionalPolicyElement extends ForgeElement {
      static readonly shadow = {
        mode: 'open' as const,
        delegatesFocus: true,
        serializable: true,
        clonable: true,
        slotAssignment: 'manual' as const,
      };

      attachShadow(init: ShadowRootInit): ShadowRoot {
        attempts.push(init);
        if ('serializable' in init || 'clonable' in init || init.slotAssignment === 'manual') {
          throw new Error('optional field unsupported');
        }
        return super.attachShadow(init);
      }

      render(): TemplateResult {
        return html`
          <slot></slot>
        `;
      }
    }
    customElements.define('mp-optional-policy', OptionalPolicyElement);

    document.body.append(new OptionalPolicyElement());

    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toMatchObject({ mode: 'open', delegatesFocus: true, serializable: true, clonable: true });
    expect(attempts[1]).toEqual({ mode: 'open', delegatesFocus: true });
  });

  it('does not require ElementInternals when the platform lacks attachInternals', () => {
    class NoInternalsElement extends ForgeElement {
      attachInternals(): ElementInternals {
        throw new Error('attachInternals is unavailable');
      }

      get exposedInternals(): ElementInternals | undefined {
        return this.elementInternals;
      }

      render(): TemplateResult {
        return html`
          <span>safe</span>
        `;
      }
    }
    customElements.define('mp-no-internals', NoInternalsElement);

    const element = new NoInternalsElement();
    expect(() => document.body.append(element)).not.toThrow();
    expect(element.exposedInternals).toBeUndefined();
  });

  it('applies default ARIA through internals without overriding author attributes', () => {
    const internals = {
      role: undefined,
      ariaLabel: undefined,
      states: new Set<string>(),
    } as unknown as ElementInternals;
    class AriaElement extends ForgeElement {
      static readonly internals = {
        attach: true,
        aria: { role: 'status', 'aria-label': 'Generated label' },
      };

      attachInternals(): ElementInternals {
        return internals;
      }

      markBusy(): void {
        this.setCustomState('busy', true);
      }

      render(): TemplateResult {
        return html`
          <span>aria</span>
        `;
      }
    }
    customElements.define('mp-aria-policy', AriaElement);

    const authorElement = new AriaElement();
    authorElement.setAttribute('role', 'button');
    authorElement.setAttribute('aria-label', 'Author label');
    document.body.append(authorElement);

    expect(internals.role).toBeUndefined();
    expect(internals.ariaLabel).toBeUndefined();

    const generatedElement = new AriaElement();
    document.body.append(generatedElement);
    expect(internals.role).toBe('status');
    expect(internals.ariaLabel).toBe('Generated label');
    generatedElement.markBusy();
    expect((internals.states as unknown as Set<string>).has('busy')).toBe(true);
  });

  it('synchronizes opt-in form values and validity through internals', () => {
    const formValues: Array<string | File | FormData | null> = [];
    const validityCalls: Array<{ flags: ValidityStateFlags; message: string }> = [];
    const internals = {
      setFormValue: (value: string | File | FormData | null) => formValues.push(value),
      setValidity: (flags: ValidityStateFlags, message: string) => validityCalls.push({ flags, message }),
      states: new Set<string>(),
    } as unknown as ElementInternals;
    class FormElement extends ForgeElement {
      static readonly formAssociated = true;
      static readonly internals = { attach: true, formAssociated: true, formValue: 'default' };

      attachInternals(): ElementInternals {
        return internals;
      }

      markInvalid(): void {
        this.setValidity({ valueMissing: true }, 'A value is required');
      }

      render(): TemplateResult {
        return html`
          <span>form</span>
        `;
      }
    }
    customElements.define('mp-form-policy', FormElement);

    const element = new FormElement();
    document.body.append(element);
    element.markInvalid();
    element.formResetCallback();

    expect(formValues).toEqual(['default', 'default']);
    expect(validityCalls).toEqual([{ flags: { valueMissing: true }, message: 'A value is required' }]);
  });

  it('reuses Forge behavior while preserving a customized native host prototype', () => {
    class NativeElement extends ForgeElementMixin(HTMLDivElement) {
      render(): TemplateResult {
        return html`
          <span class="native">native host</span>
        `;
      }
    }
    customElements.define('mp-native-policy', NativeElement, { extends: 'div' });

    const element = document.createElement('div', { is: 'mp-native-policy' }) as NativeElement;
    document.body.append(element);

    expect(element).toBeInstanceOf(HTMLDivElement);
    expect(element.forgeRenderRoot?.querySelector('.native')?.textContent).toBe('native host');
  });
});

/** A host element with the given light-DOM children. */
function host(...children: readonly Node[]): HTMLElement {
  const element = document.createElement('div');
  element.append(...children);
  return element;
}

/** An element child, optionally assigned to a named slot. */
function child(slot?: string): HTMLElement {
  const element = document.createElement('span');
  if (slot !== undefined) {
    element.setAttribute('slot', slot);
  }
  return element;
}

describe('the native `hasSlotContent`', () => {
  it('reports the default slot from any unassigned child', () => {
    expect(hasSlotContent(host(child()))).toBe(true);
    expect(hasSlotContent(host(document.createTextNode('text')))).toBe(true);
    // An explicit `'default'` names the same slot.
    expect(hasSlotContent(host(child()), 'default')).toBe(true);
    expect(hasSlotContent(host(child('footer')))).toBe(false);
    expect(hasSlotContent(host())).toBe(false);
  });

  it('ignores whitespace-only text, which fills no slot', () => {
    expect(hasSlotContent(host(document.createTextNode('\n  ')))).toBe(false);
  });

  it('reports a named slot, kebab-case or camelCase', () => {
    expect(hasSlotContent(host(child('footer')), 'footer')).toBe(true);
    expect(hasSlotContent(host(child('start-content')), 'start-content')).toBe(true);
    expect(hasSlotContent(host(child('avatarContent')), 'avatarContent')).toBe(true);
    expect(hasSlotContent(host(child('footer')), 'header')).toBe(false);
  });

  it('considers only direct children, like slot assignment itself', () => {
    const wrapper = host(child('footer'));
    expect(hasSlotContent(host(wrapper), 'footer')).toBe(false);
  });
});

/** The counter part of a generated id. */
function idNumber(id: string): number {
  return Number(id.slice('forge-'.length));
}
