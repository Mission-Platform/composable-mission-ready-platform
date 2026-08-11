// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { ForgeElement, hasSlotContent, html, HtmlContent, nothing, render, unsafeHtml, useId } from './web-components';

import type { TemplateResult } from './web-components';

/**
 * A representative generated-style element: a reactive `state` count, an
 * observed `label` property/attribute, an event binding, a conditional
 * (`nothing`) hole and a `.map()` list — the full template dialect the
 * Web-Components generator emits.
 */
class CounterElement extends ForgeElement {
  static readonly properties = { label: {}, count: { state: true } };

  declare label?: string;
  declare count: number;

  constructor() {
    super();
    this.count = 0;
  }

  render(): TemplateResult {
    return html`
      <div class="counter">
        <span class="label">${this.label}</span>
        <button
          @click=${() => {
            this.count = this.count + 1;
          }}
        >
          +
        </button>
        <span class="value">${this.count}</span>
        ${
          this.count > 0
            ? html`
                <em class="positive">positive</em>
              `
            : nothing
        }
        <ul>
          ${[1, 2, 3].map(
            (n) => html`
              <li>${n}</li>
            `,
          )}
        </ul>
      </div>
    `;
  }
}

if (!customElements.get('mp-counter-test')) {
  customElements.define('mp-counter-test', CounterElement);
}

/** Mount a fresh counter element and return it once connected + rendered. */
function mountCounter(attributes: Record<string, string> = {}): CounterElement {
  const element = document.createElement('mp-counter-test') as CounterElement;
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  document.body.append(element);
  return element;
}

const tick = (): Promise<void> => Promise.resolve();

afterEach(() => {
  document.body.replaceChildren();
});

describe('the native `html` tagged template + `render`', () => {
  it('renders text, attribute, boolean, property and event bindings into a container', () => {
    const container = document.createElement('div');
    const clicks: string[] = [];
    render(
      html`
        <button
          class=${'primary'}
          ?disabled=${true}
          .title=${'go'}
          @click=${() => clicks.push('hit')}
        >
          press
        </button>
      `,
      container,
    );
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.getAttribute('class')).toBe('primary');
    expect(button?.hasAttribute('disabled')).toBe(true);
    expect((button as HTMLButtonElement).title).toBe('go');
    button?.dispatchEvent(new Event('click'));
    expect(clicks).toEqual(['hit']);
  });

  it('renders `nothing` and nested templates/arrays in child position', () => {
    const container = document.createElement('div');
    render(
      html`
        <div>
          ${nothing}${html`
            <span>a</span>
          `}${[
            html`
              <i>b</i>
            `,
            html`
              <i>c</i>
            `,
          ]}
        </div>
      `,
      container,
    );
    const root = container.querySelector('div');
    expect(root?.querySelector('span')?.textContent).toBe('a');
    expect([...(root?.querySelectorAll('i') ?? [])].map((node) => node.textContent)).toEqual(['b', 'c']);
  });

  it('renders trusted raw content without escaping it', () => {
    const container = document.createElement('div');
    render(
      html`
        <section>${unsafeHtml('<svg><title>trusted</title></svg>')}</section>
      `,
      container,
    );

    expect(container.querySelector('svg title')?.textContent).toBe('trusted');
    expect(container.textContent).not.toContain('<svg>');
  });

  it('renders HtmlContent into the requested host and forwards attributes/ref', () => {
    const container = document.createElement('div');
    const reference: { current?: Element } = { current: undefined };
    render(
      HtmlContent({
        as: 'section',
        html: '<strong>content</strong>',
        className: 'content',
        id: 'content-host',
        ref: reference,
      }),
      container,
    );

    expect(container.firstElementChild?.outerHTML).toBe(
      '<section class="content" id="content-host"><strong>content</strong></section>',
    );
    expect(reference.current).toBe(container.firstElementChild);
  });

  it('drops an attribute whose value is `false`/`null`/`nothing`', () => {
    const container = document.createElement('div');
    render(
      html`
        <a
          href=${false}
          title=${nothing}
          rel=${'noopener'}
        ></a>
      `,
      container,
    );
    const anchor = container.querySelector('a');
    expect(anchor?.hasAttribute('href')).toBe(false);
    expect(anchor?.hasAttribute('title')).toBe(false);
    expect(anchor?.getAttribute('rel')).toBe('noopener');
  });
});

describe('the `ForgeElement` base class', () => {
  it('renders into an open shadow root on connect', () => {
    const element = mountCounter({ label: 'hits' });
    const root = element.shadowRoot;
    expect(root).not.toBeNull();
    expect(root?.querySelector('.label')?.textContent).toBe('hits');
    expect(root?.querySelector('.value')?.textContent).toBe('0');
    expect(root?.querySelectorAll('li')).toHaveLength(3);
    // count is 0, so the conditional `positive` branch renders `nothing`.
    expect(root?.querySelector('.positive')).toBeNull();
  });

  it('reflects an observed attribute onto its property', () => {
    const element = mountCounter({ label: 'from-attr' });
    expect(element.shadowRoot?.querySelector('.label')?.textContent).toBe('from-attr');
  });

  it('re-renders asynchronously when a reactive property changes', async () => {
    const element = mountCounter();
    element.count = 2;
    await tick();
    expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('2');
    expect(element.shadowRoot?.querySelector('.positive')?.textContent).toBe('positive');
  });

  it('re-renders in response to an event binding', async () => {
    const element = mountCounter();
    const button = element.shadowRoot?.querySelector('button');
    button?.dispatchEvent(new Event('click'));
    await tick();
    expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('1');
  });

  it('observes the lower-cased attribute name for each non-state property', () => {
    expect(CounterElement.observedAttributes).toContain('label');
    // Internal `state` properties are not observed as attributes.
    expect(CounterElement.observedAttributes).not.toContain('count');
  });
});

/**
 * A generated-style element whose reactive `state` is seeded the way the
 * Web-Components emitter does it: declaration-only, assigned in the constructor.
 */
class SeededElement extends ForgeElement {
  static readonly properties = { count: { state: true } };

  declare count: number;

  constructor() {
    super();
    this.count = 0;
  }

  render(): TemplateResult {
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

  setup(): void {
    const { modelValue = '0' } = this;
    this.doubled = Number(modelValue) * 2;
  }

  render(): TemplateResult {
    return html`
      <span class="value">${this.doubled}</span>
    `;
  }
}
customElements.define('mp-deferred-seed', DeferredSeedElement);

describe('reactive state seeding', () => {
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

  it('seeds state from a property set as an attribute before the first render', () => {
    const element = document.createElement('mp-deferred-seed');
    element.setAttribute('modelvalue', '21');
    document.body.append(element);

    // `setup` runs after `adoptAttributes`, so the seed reads the real value —
    // in the constructor it would have read `undefined` and fallen back to `0`.
    expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('42');
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

describe('the native `useId`', () => {
  it('produces a prefixed, selector-safe id', () => {
    expect(useId()).toMatch(/^forge-\d+$/);
  });

  it('never repeats an id across calls', () => {
    const ids = Array.from({ length: 100 }, () => useId());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('increases monotonically', () => {
    const first = idNumber(useId());
    const second = idNumber(useId());
    expect(second).toBeGreaterThan(first);
  });
});
