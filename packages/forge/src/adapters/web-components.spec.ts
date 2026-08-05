// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { ForgeElement, html, nothing, render } from './web-components';

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
