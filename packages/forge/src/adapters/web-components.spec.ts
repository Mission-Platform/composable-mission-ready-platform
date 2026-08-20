// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { createContext, useContext } from '../runtime/context';

import {
  dynamicElement,
  DomTemplateResult,
  ForgeElement,
  ForgeElementMixin,
  hasSlotContent,
  html,
  HtmlContent,
  nothing,
  render,
  unsafeHtml,
  useId,
} from './web-components';
import { TemplateInstance } from './web-components-renderer';

import type { DomTemplateDefinition, TemplateResult } from './web-components-renderer';

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

class PreUpgradeElement extends ForgeElement {
  static readonly properties = { open: {} };

  declare open: boolean;

  render(): TemplateResult {
    return html`
      <section>
        ${
          this.open
            ? html`
                <span class="visible">shown</span>
              `
            : nothing
        }
      </section>
    `;
  }
}

class UpdatedCallbackElement extends ForgeElement {
  static readonly properties = { value: {} };

  declare value: string;
  updates = 0;

  updatedCallback(): void {
    this.updates += 1;
  }

  render(): TemplateResult {
    return html`
      <span>${this.value}</span>
    `;
  }
}

class StyledElement extends ForgeElement {
  static readonly properties = { count: { state: true } };
  static readonly styleUrls = ['/styles/own.css', '/styles/shared.css', '/styles/own.css'];

  declare count: number;

  constructor() {
    super();
    this.count = 0;
  }

  render(): TemplateResult {
    return html`
      <span class="count">${this.count}</span>
    `;
  }
}

class NormalizedValuesElement extends ForgeElement {
  static readonly properties = { active: { state: true } };

  declare active: boolean;

  constructor() {
    super();
    this.active = true;
  }

  render(): TemplateResult {
    return html`
      <div
        class=${['base', ['nested', { active: this.active, disabled: false }]]}
        style=${{ backgroundColor: 'red', fontSize: '12px', '--gap': '2px' }}
      >
        ${
          this.active
            ? html`
                <span>visible</span>
              `
            : nothing
        }
      </div>
    `;
  }
}

class ChildrenElement extends ForgeElement {
  static readonly properties = { version: { state: true } };

  declare version: number;

  constructor() {
    super();
    this.version = 0;
  }

  render(): TemplateResult {
    return html`
      <section>
        ${this.children}
        <span>${this.version}</span>
      </section>
    `;
  }
}

class DynamicSlotElement extends ForgeElement {
  static readonly properties = {
    enabled: { state: true },
    slotName: { state: true },
  };

  declare enabled: boolean;
  declare slotName: string;

  constructor() {
    super();
    this.enabled = true;
    this.slotName = 'default';
  }

  render(): TemplateResult {
    return html`
      <section class="projection">
        <forge-slot
          data-mp-forge-slot="default"
          .name=${this.slotName}
          .content=${this.enabled ? this.children : undefined}
        ></forge-slot>
      </section>
    `;
  }
}

class StyledProjectionElement extends ForgeElement {
  static readonly styleUrls = ['/styles/projection-owner.css'];

  render(): TemplateResult {
    return html`
      <forge-slot
        data-mp-forge-slot="default"
        .content=${this.children}
      ></forge-slot>
    `;
  }
}

class MaterializingSlotElement extends ForgeElement {
  render(): TemplateResult {
    return html`
      <div class="materialized-outlets">
        <forge-slot
          data-mp-forge-slot="default"
          .content=${[
            this.children,
            html`
              <i class="extra">extra</i>
            `,
          ]}
        ></forge-slot>
        <forge-slot
          data-mp-forge-slot="default"
          .content=${[
            this.children,
            html`
              <i class="extra">extra</i>
            `,
          ]}
        ></forge-slot>
      </div>
    `;
  }
}

class StyledMaterializingOwnerElement extends ForgeElement {
  static readonly styleUrls = ['/styles/materialized-owner.css'];

  render(): TemplateResult {
    return html`
      <mp-materializing-slot-test>${this.children}</mp-materializing-slot-test>
    `;
  }
}

class FallbackSlotElement extends ForgeElement {
  render(): TemplateResult {
    return html`
      <forge-slot data-mp-forge-slot="true">fallback</forge-slot>
    `;
  }
}

/** A generated-style controlled text input that echoes its native input value. */
class ControlledInputElement extends ForgeElement {
  static readonly properties = { modelValue: { state: true } };

  declare modelValue: unknown;

  constructor() {
    super();
    this.modelValue = 'initial';
  }

  render(): TemplateResult {
    return html`
      <input
        class="control"
        .value=${this.modelValue}
        @input=${(event: Event) => {
          this.modelValue = (event.currentTarget as HTMLInputElement).value;
        }}
      />
      <output>${this.modelValue}</output>
    `;
  }
}

/** A generated-style controlled textarea with the same model-echo contract. */
class ControlledTextareaElement extends ForgeElement {
  static readonly properties = { modelValue: { state: true } };

  declare modelValue: string;

  constructor() {
    super();
    this.modelValue = 'initial text';
  }

  render(): TemplateResult {
    return html`
      <textarea
        class="control"
        .value=${this.modelValue}
        @input=${(event: Event) => {
          this.modelValue = (event.currentTarget as HTMLTextAreaElement).value;
        }}
      ></textarea>
      <output>${this.modelValue}</output>
    `;
  }
}

if (!customElements.get('mp-counter-test')) {
  customElements.define('mp-counter-test', CounterElement);
}
if (!customElements.get('mp-updated-callback-test')) {
  customElements.define('mp-updated-callback-test', UpdatedCallbackElement);
}
if (!customElements.get('mp-styled-test')) {
  customElements.define('mp-styled-test', StyledElement);
}
if (!customElements.get('mp-normalized-values-test')) {
  customElements.define('mp-normalized-values-test', NormalizedValuesElement);
}
if (!customElements.get('mp-children-test')) {
  customElements.define('mp-children-test', ChildrenElement);
}
if (!customElements.get('mp-dynamic-slot-test')) {
  customElements.define('mp-dynamic-slot-test', DynamicSlotElement);
}
if (!customElements.get('mp-styled-projection-test')) {
  customElements.define('mp-styled-projection-test', StyledProjectionElement);
}
if (!customElements.get('mp-materializing-slot-test')) {
  customElements.define('mp-materializing-slot-test', MaterializingSlotElement);
}
if (!customElements.get('mp-styled-materializing-owner-test')) {
  customElements.define('mp-styled-materializing-owner-test', StyledMaterializingOwnerElement);
}
if (!customElements.get('mp-fallback-slot-test')) {
  customElements.define('mp-fallback-slot-test', FallbackSlotElement);
}
if (!customElements.get('mp-controlled-input-test')) {
  customElements.define('mp-controlled-input-test', ControlledInputElement);
}
if (!customElements.get('mp-controlled-textarea-test')) {
  customElements.define('mp-controlled-textarea-test', ControlledTextareaElement);
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

function liveBindingsView(value: string, disabled: boolean, handler: () => void): TemplateResult {
  return html`
    <div class=${['field', { enabled: !disabled }]}>
      <input
        .value=${value}
        ?disabled=${disabled}
        @click=${handler}
      />
      <span>${value}</span>
    </div>
  `;
}

function positionalListView(items: readonly string[], show: boolean): TemplateResult {
  return html`
    <ul>
      ${items.map(
        (item) => html`
          <li>${item}</li>
        `,
      )}
    </ul>
    ${
      show
        ? html`
            <strong>shown</strong>
          `
        : nothing
    }
  `;
}

function eventView(handler: (() => void) | undefined): TemplateResult {
  return html`
    <button @click=${handler}>go</button>
  `;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('the native `html` tagged template + `render`', () => {
  it('materializes computed intrinsic tags and applies normalized bindings', () => {
    const container = document.createElement('div');
    const clicks: string[] = [];
    render(
      html`
        ${dynamicElement(
          'button',
          {
            '~class': ['primary', { active: true }],
            '?disabled': true,
            '~value': 'send',
            '@click': () => clicks.push('clicked'),
          },
          html`
            send
          `,
        )}
      `,
      container,
    );

    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button.className).toBe('primary active');
    expect(button.disabled).toBe(true);
    expect(button.value).toBe('send');
    button.dispatchEvent(new Event('click'));
    expect(clicks).toEqual(['clicked']);
  });

  it('delivers computed properties to custom elements', () => {
    class DynamicTargetElement extends HTMLElement {
      value: unknown;
    }
    if (!customElements.get('mp-dynamic-target')) {
      customElements.define('mp-dynamic-target', DynamicTargetElement);
    }
    const container = document.createElement('div');
    const child = html`
      child
    `;
    render(
      html`
        ${dynamicElement('mp-dynamic-target', { '~modelValue': { id: 1 } }, child)}
      `,
      container,
    );

    const target = container.firstElementChild as DynamicTargetElement;
    expect(target.value).toEqual(undefined);
    expect((target as unknown as { modelValue?: { id: number } }).modelValue).toEqual({ id: 1 });
    expect(target.textContent?.trim()).toBe('child');
  });

  it('applies raw spread properties and model-update event names', () => {
    class SpreadTargetElement extends HTMLElement {
      modelValue: unknown;
    }
    if (!customElements.get('mp-spread-target')) {
      customElements.define('mp-spread-target', SpreadTargetElement);
    }
    const container = document.createElement('div');
    const updates: unknown[] = [];
    const onUpdate = (value: unknown): void => updates.push(value);

    render(
      html`
        ${dynamicElement(
          'mp-spread-target',
          {
            'onUpdate:modelValue': onUpdate,
            onUpdateModelValue: onUpdate,
            modelValue: 'initial',
          },
          html`
            child
          `,
        )}
      `,
      container,
    );

    const target = container.firstElementChild as SpreadTargetElement;
    expect(target.modelValue).toBe('initial');
    target.dispatchEvent(new CustomEvent('update:modelValue', { detail: 'colon' }));
    target.dispatchEvent(new CustomEvent('updateModelValue', { detail: 'camel' }));
    expect(updates).toHaveLength(2);
  });

  it('renders computed component functions and context providers', () => {
    const context = createContext('default');
    const Reader = (): TemplateResult => html`
      <span>${useContext(context)}</span>
    `;
    const container = document.createElement('div');

    render(
      html`
        ${dynamicElement(context.Provider, { '~value': 'provided' }, dynamicElement(Reader, {}))}
      `,
      container,
    );

    expect(container.textContent?.trim()).toBe('provided');
    expect(useContext(context)).toBe('default');
  });

  it('normalizes nested class values and style objects into valid DOM values', () => {
    const container = document.createElement('div');

    render(
      html`
        <div
          class=${['base', ['nested', { active: true, disabled: false }]]}
          style=${{ backgroundColor: 'red', fontSize: '12px', '--gap': '2px' }}
        ></div>
      `,
      container,
    );

    const element = container.firstElementChild;
    expect(element?.getAttribute('class')).toBe('base nested active');
    expect(element?.getAttribute('style')).toContain('background-color: red');
    expect(element?.getAttribute('style')).toContain('font-size: 12px');
    expect(element?.getAttribute('style')).toContain('--gap: 2px');
    expect(element?.outerHTML).not.toContain('[object Object]');
  });

  it('assigns and clears template refs for native elements', () => {
    const container = document.createElement('div');
    const reference: { current: Element | null | undefined } = { current: undefined };
    const view = (visible: boolean): TemplateResult =>
      visible
        ? html`
            <div ref=${reference}></div>
          `
        : html`
            <span></span>
          `;

    render(view(true), container);
    expect(reference.current?.localName).toBe('div');

    render(view(false), container);
    expect(reference.current).toBeNull();
  });

  it('updates normalized values on rerender and preserves them across reconnect', async () => {
    const element = document.createElement('mp-normalized-values-test') as NormalizedValuesElement;
    document.body.append(element);
    await tick();

    expect(element.shadowRoot?.querySelector('.active')).not.toBeNull();
    element.active = false;
    await tick();

    expect(element.shadowRoot?.querySelector('.active')).toBeNull();
    expect(element.shadowRoot?.querySelector('[style]')?.getAttribute('class')).toBe('base nested');

    element.remove();
    document.body.append(element);
    await tick();

    expect(element.shadowRoot?.textContent).not.toContain('visible');
    expect(element.shadowRoot?.querySelector('[style]')?.getAttribute('class')).toBe('base nested');
  });

  it('renders light-DOM children as nodes and keeps custom children across rerenders', async () => {
    const element = document.createElement('mp-children-test') as ChildrenElement;
    const child = document.createElement('strong');
    child.textContent = 'content';
    element.append(child);
    document.body.append(element);
    await tick();

    expect(element.shadowRoot?.textContent).toContain('content');
    expect(element.shadowRoot?.textContent).toContain('0');
    element.version = 1;
    await tick();

    expect(element.shadowRoot?.textContent).toContain('content');
    expect(element.shadowRoot?.textContent).toContain('1');
    expect(element.shadowRoot?.textContent).not.toContain('[object HTMLCollection]');
  });

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

  it('updates a conditional range when its marker is the final child', () => {
    const container = document.createElement('div');
    const view = (visible: boolean): TemplateResult => html`
      <section>
        ${
          visible
            ? html`
                <span class="visible">shown</span>
              `
            : nothing
        }
      </section>
    `;

    render(view(false), container);
    render(view(true), container);

    expect(container.querySelector('.visible')?.textContent).toBe('shown');
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

  it('updates live bindings without replacing unaffected nodes or listeners', () => {
    const container = document.createElement('div');
    const calls: string[] = [];
    const firstHandler = (): void => calls.push('first');
    const secondHandler = (): void => calls.push('second');

    render(liveBindingsView('draft', false, firstHandler), container);
    const input = container.querySelector('input') as HTMLInputElement;
    const span = container.querySelector('span') as HTMLSpanElement;
    const wrapper = container.firstElementChild;
    input.value = 'draft-user-edit';

    render(liveBindingsView('draft', true, secondHandler), container);

    expect(container.firstElementChild).toBe(wrapper);
    expect(container.querySelector('input')).toBe(input);
    expect(container.querySelector('span')).toBe(span);
    expect(input.value).toBe('draft-user-edit');
    expect(input.disabled).toBe(true);
    expect(wrapper?.className).toBe('field');
    input.dispatchEvent(new Event('click'));
    expect(calls).toEqual(['second']);
  });

  it('reuses compatible nested templates positionally and disposes removed ranges', () => {
    const container = document.createElement('div');
    render(positionalListView(['one', 'two', 'three'], true), container);
    const listItems = [...container.querySelectorAll('li')];
    const strong = container.querySelector('strong');

    render(positionalListView(['ONE', 'TWO'], false), container);

    expect([...container.querySelectorAll('li')].slice(0, 2)).toEqual(listItems.slice(0, 2));
    expect(listItems[0]?.textContent).toBe('ONE');
    expect(listItems[1]?.textContent).toBe('TWO');
    expect(listItems[2]?.isConnected).toBe(false);
    expect(strong?.isConnected).toBe(false);
  });

  it('removes replaced event listeners and disposes a template instance', () => {
    const container = document.createElement('div');
    const calls: string[] = [];
    const first = (): void => calls.push('first');
    const second = (): void => calls.push('second');

    render(eventView(first), container);
    const button = container.querySelector('button') as HTMLButtonElement;
    render(eventView(second), container);
    button.click();
    expect(calls).toEqual(['second']);

    const instance = new TemplateInstance(eventView(second));
    instance.mount(container);
    instance.dispose();
    expect(container.querySelector('button')).toBe(button);
    button.click();
    expect(calls).toEqual(['second', 'second']);
  });
});

describe('direct DOM template results', () => {
  function directDefinition(): DomTemplateDefinition {
    return {
      create: (ownerDocument) => {
        const section = ownerDocument.createElement('section');
        const marker = ownerDocument.createComment('slot');
        section.append(marker);
        return {
          nodes: [section],
          parts: [{ kind: 'node', id: 0, start: marker }],
        };
      },
    };
  }

  it('constructs direct DOM once and updates the existing node range', () => {
    const container = document.createElement('div');
    const definition = directDefinition();
    render(new DomTemplateResult(definition, ['first']), container);
    const section = container.firstElementChild;

    render(new DomTemplateResult(definition, ['second']), container);

    expect(container.firstElementChild).toBe(section);
    expect(section?.textContent).toBe('second');
  });

  it('preserves generated custom-element identity across direct DOM updates', () => {
    class GeneratedChildElement extends HTMLElement {
      connected = 0;
      disconnected = 0;

      connectedCallback(): void {
        this.connected += 1;
      }

      disconnectedCallback(): void {
        this.disconnected += 1;
      }
    }
    if (!customElements.get('mp-generated-child')) {
      customElements.define('mp-generated-child', GeneratedChildElement);
    }

    const definition: DomTemplateDefinition = {
      create: (ownerDocument) => {
        const section = ownerDocument.createElement('section');
        const child = ownerDocument.createElement('mp-generated-child');
        const marker = ownerDocument.createComment('slot');
        child.append(marker);
        section.append(child);
        return {
          nodes: [section],
          parts: [{ kind: 'node', id: 0, start: marker }],
        };
      },
    };
    const container = document.createElement('div');
    document.body.append(container);

    render(new DomTemplateResult(definition, ['first']), container);
    const child = container.querySelector('mp-generated-child') as GeneratedChildElement;
    render(new DomTemplateResult(definition, ['second']), container);

    expect(container.querySelector('mp-generated-child')).toBe(child);
    expect(child.textContent).toBe('second');
    expect(child.connected).toBe(1);
    expect(child.disconnected).toBe(0);
  });

  it('keeps event aliases and CustomEvent detail identical to the html path', () => {
    const directCalls: unknown[] = [];
    const legacyCalls: unknown[] = [];
    const directDefinition: DomTemplateDefinition = {
      create: (ownerDocument) => {
        const button = ownerDocument.createElement('button');
        return {
          nodes: [button],
          parts: [{ kind: 'attr', id: 0, element: button, prefix: '@', name: 'update-model-value' }],
        };
      },
    };
    const directContainer = document.createElement('div');
    const legacyContainer = document.createElement('div');
    const handler = (value: unknown): void => directCalls.push(value);
    const legacyHandler = (value: unknown): void => legacyCalls.push(value);

    render(new DomTemplateResult(directDefinition, [handler]), directContainer);
    render(
      html`
        <button @update-model-value=${legacyHandler}></button>
      `,
      legacyContainer,
    );
    const directButton = directContainer.firstElementChild as HTMLButtonElement;
    const legacyButton = legacyContainer.firstElementChild as HTMLButtonElement;
    for (const eventName of ['update-model-value', 'updateModelValue']) {
      directButton.dispatchEvent(new CustomEvent(eventName, { detail: eventName }));
      legacyButton.dispatchEvent(new CustomEvent(eventName, { detail: eventName }));
    }

    expect(directCalls).toEqual(['update-model-value', 'updateModelValue']);
    expect(legacyCalls).toEqual(directCalls);
  });

  it('keeps generated literal text literal without invoking an HTML parser', () => {
    const literal = '<tag attr="quoted"> ` ${value} & text';
    const definition: DomTemplateDefinition = {
      create: (ownerDocument) => ({
        nodes: [ownerDocument.createTextNode(literal)],
        parts: [],
      }),
    };
    const container = document.createElement('div');

    render(new DomTemplateResult(definition, []), container);

    expect(container.childNodes).toHaveLength(1);
    expect(container.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(container.textContent).toBe(literal);
  });

  it('disposes direct DOM bindings when switching to and from HtmlContent', () => {
    const calls: string[] = [];
    const reference: { current: Element | null | undefined } = { current: undefined };
    const definition: DomTemplateDefinition = {
      create: (ownerDocument) => {
        const button = ownerDocument.createElement('button');
        const marker = ownerDocument.createComment('slot');
        button.append(marker);
        return {
          nodes: [button],
          parts: [
            { kind: 'node', id: 0, start: marker },
            { kind: 'attr', id: 1, element: button, prefix: '@', name: 'click' },
            { kind: 'attr', id: 2, element: button, prefix: '', name: 'ref' },
          ],
        };
      },
    };
    const container = document.createElement('div');
    const handler = (): void => calls.push('stale');

    render(new DomTemplateResult(definition, ['before', handler, reference]), container);
    const oldButton = container.querySelector('button') as HTMLButtonElement;
    render(HtmlContent({ as: 'section', html: '<span>trusted</span>' }), container);
    expect(oldButton.isConnected).toBe(false);
    expect(reference.current).toBeNull();
    oldButton.click();
    expect(calls).toEqual([]);

    render(new DomTemplateResult(definition, ['after', handler, reference]), container);
    expect(container.querySelector('button')).not.toBe(oldButton);
    expect(reference.current).toBe(container.querySelector('button'));
    expect(container.textContent).toContain('after');
  });

  it('clones a lazy hot blueprint and disposes the previous materialized root', () => {
    let templateBuilds = 0;
    const reference: { current: Element | null | undefined } = { current: undefined };
    const calls: string[] = [];
    const definition: DomTemplateDefinition = {
      hotTemplate: (ownerDocument) => {
        templateBuilds += 1;
        const template = ownerDocument.createElement('template');
        const button = ownerDocument.createElement('button');
        const marker = ownerDocument.createComment('slot');
        button.append(marker);
        template.content.append(button);
        return template;
      },
      parts: [
        { kind: 'node', id: 0, path: [0, 0] },
        { kind: 'attr', id: 1, path: [0], prefix: '@', name: 'click' },
        { kind: 'attr', id: 2, path: [0], prefix: '', name: 'ref' },
      ],
    };
    const container = document.createElement('div');
    const handler = (): void => calls.push('clicked');
    render(new DomTemplateResult(definition, ['click', handler, reference]), container);
    const button = container.querySelector('button') as HTMLButtonElement;
    expect(reference.current).toBe(button);

    render(new DomTemplateResult(definition, ['updated', handler, reference]), container);
    expect(templateBuilds).toBe(1);
    expect(container.querySelector('button')).toBe(button);
    expect(button.textContent).toBe('updated');

    render(dynamicElement('div', {}, 'replacement'), container);
    expect(button.isConnected).toBe(false);
    expect(container.textContent).toBe('replacement');
    button.click();
    expect(calls).toEqual([]);
    expect(reference.current).toBeNull();
  });

  it('keeps event detail and ref behavior shared with dynamic materialization', () => {
    const container = document.createElement('div');
    const reference: { current: Element | null | undefined } = { current: undefined };
    const details: unknown[] = [];
    render(
      dynamicElement('button', {
        ref: reference,
        onUpdateModelValue: (value: unknown) => details.push(value),
      }),
      container,
    );
    const button = container.firstElementChild as HTMLButtonElement;
    button.dispatchEvent(new CustomEvent('update-model-value', { detail: 'value' }));

    expect(reference.current).toBe(button);
    expect(details).toEqual(['value']);
    render(dynamicElement('span', {}, 'done'), container);
    expect(reference.current).toBeNull();
  });
});

describe('ForgeElement shadow-root styles', () => {
  it('mounts own and shared style URLs once and preserves them across rerenders', async () => {
    const element = document.createElement('mp-styled-test') as StyledElement;
    document.body.append(element);

    const styles = () => [...element.shadowRoot!.querySelectorAll('link[data-mp-forge-style]')];
    expect(styles()).toHaveLength(2);
    expect(styles().map((style) => style.getAttribute('href'))).toEqual(['/styles/own.css', '/styles/shared.css']);

    const firstStyles = styles();
    element.count = 1;
    await tick();
    expect(element.shadowRoot?.textContent).toContain('1');
    expect(styles()).toEqual(firstStyles);

    element.remove();
    document.body.append(element);
    expect(styles()).toEqual(firstStyles);
  });

  it('keeps a missing stylesheet non-fatal', () => {
    class MissingStyleElement extends ForgeElement {
      static readonly styleUrls = ['/missing/forge-element.css'];

      render(): TemplateResult {
        return html`
          <span>ready</span>
        `;
      }
    }
    if (!customElements.get('mp-missing-style-test')) {
      customElements.define('mp-missing-style-test', MissingStyleElement);
    }

    const element = document.createElement('mp-missing-style-test');
    expect(() => document.body.append(element)).not.toThrow();
    expect(element.shadowRoot?.querySelector('link')?.getAttribute('href')).toBe('/missing/forge-element.css');
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

  it('replays a property assigned before a custom element upgrades', () => {
    const element = document.createElement('mp-pre-upgrade-test') as PreUpgradeElement;
    element.open = true;
    customElements.define('mp-pre-upgrade-test', PreUpgradeElement);
    document.body.append(element);

    expect(element.shadowRoot?.querySelector('.visible')?.textContent).toBe('shown');
  });

  it('runs the post-render lifecycle after a reactive property update', async () => {
    const element = document.createElement('mp-updated-callback-test') as UpdatedCallbackElement;
    document.body.append(element);
    element.value = 'updated';
    await tick();

    expect(element.updates).toBe(1);
    expect(element.shadowRoot?.textContent).toContain('updated');
  });

  it('updates the existing shadow tree and only replaces the conditional range', async () => {
    const element = mountCounter({ label: 'stable' });
    const root = element.shadowRoot;
    const counter = root?.querySelector('.counter');
    const label = root?.querySelector('.label');
    const button = root?.querySelector('button');
    const list = root?.querySelector('ul');

    element.count = 1;
    await tick();
    const positive = root?.querySelector('.positive');
    expect(element.shadowRoot).toBe(root);
    expect(root?.querySelector('.counter')).toBe(counter);
    expect(root?.querySelector('.label')).toBe(label);
    expect(root?.querySelector('button')).toBe(button);
    expect(root?.querySelector('ul')).toBe(list);

    element.count = 2;
    await tick();
    expect(root?.querySelector('.positive')).toBe(positive);
    expect(root?.querySelector('.value')?.textContent).toBe('2');
  });

  it('keeps the live instance and state when disconnected and reconnected', async () => {
    const element = mountCounter({ label: 'reconnect' });
    const root = element.shadowRoot;
    const counter = root?.querySelector('.counter');
    const button = root?.querySelector('button');
    element.count = 3;
    await tick();

    element.remove();
    document.body.append(element);
    await tick();

    expect(element.shadowRoot).toBe(root);
    expect(root?.querySelector('.counter')).toBe(counter);
    expect(root?.querySelector('button')).toBe(button);
    expect(root?.querySelector('.value')?.textContent).toBe('3');
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

describe('controlled native form controls', () => {
  it('keeps a focused input, its value, caret, and node identity across an unchanged model echo', async () => {
    const element = document.createElement('mp-controlled-input-test') as ControlledInputElement;
    document.body.append(element);
    await tick();

    const root = element.shadowRoot;
    const input = root?.querySelector('input') as HTMLInputElement;
    input.focus();
    input.value = 'user edited value';
    input.setSelectionRange(5, 11);
    const selection = [input.selectionStart, input.selectionEnd];

    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    expect(root?.querySelector('input')).toBe(input);
    expect(root?.activeElement).toBe(input);
    expect(input.value).toBe('user edited value');
    expect([input.selectionStart, input.selectionEnd]).toEqual(selection);
  });

  it('applies changed external input values without replacing the native control', async () => {
    const element = document.createElement('mp-controlled-input-test') as ControlledInputElement;
    document.body.append(element);
    await tick();

    const input = element.shadowRoot?.querySelector('input') as HTMLInputElement;
    element.modelValue = 'external seed';
    await tick();
    expect(input.value).toBe('external seed');
    for (const [nextValue, expectedValue] of [
      ['', ''],
      [42, '42'],
      [false, 'false'],
      [nothing, ''],
    ] as const) {
      element.modelValue = nextValue;
      await tick();
      expect(input.value).toBe(expectedValue);
      expect(element.shadowRoot?.querySelector('input')).toBe(input);
    }
  });

  it('keeps a focused textarea, its value, selection, and node identity across an unchanged echo', async () => {
    const element = document.createElement('mp-controlled-textarea-test') as ControlledTextareaElement;
    document.body.append(element);
    await tick();

    const root = element.shadowRoot;
    const textarea = root?.querySelector('textarea') as HTMLTextAreaElement;
    textarea.focus();
    textarea.value = 'edited multiline text';
    textarea.setSelectionRange(3, 10);
    const selection = [textarea.selectionStart, textarea.selectionEnd];

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    expect(root?.querySelector('textarea')).toBe(textarea);
    expect(root?.activeElement).toBe(textarea);
    expect(textarea.value).toBe('edited multiline text');
    expect([textarea.selectionStart, textarea.selectionEnd]).toEqual(selection);
  });
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
