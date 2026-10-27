// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { createContext, useContext } from '@mission-platform/forge-jsx/runtime';

import {
  dynamicShapeComponent,
  contextReader,
  conditionalRangeView,
  directDefinition,
  NormalizedValuesElement,
  ChildrenElement,
  tick,
  liveBindingsView,
  positionalListView,
  eventView,
} from './web-components-fixtures.js';
import { TemplateInstance } from './web-components-renderer.js';
import {
  dynamicElement,
  domTemplate,
  html,
  HtmlContent,
  memoize,
  nothing,
  render,
  suspense,
  unsafeHtml,
} from './web-components.js';

import type { DynamicShape } from './web-components-fixtures.js';
import type { DomRenderResult, DomTemplateDefinition, TemplateResult } from './web-components.js';

afterEach(() => {
  document.body.replaceChildren();
});

describe('the native `html` tagged template + `render`', () => {
  it('renders synchronous Suspense content without flashing its fallback', () => {
    const container = document.createElement('div');

    render(
      suspense(
        html`
          <span class="loading">Loading</span>
        `,
        html`
          <strong>Ready</strong>
        `,
      ),
      container,
    );

    expect(container.textContent?.trim()).toBe('Ready');
    expect(container.querySelector('.loading')).toBeNull();
  });

  it('replaces an async fallback and ignores stale or rejected content', async () => {
    const container = document.createElement('div');
    let resolve!: (value: TemplateResult) => void;
    const pending = new Promise<TemplateResult>((fulfill) => {
      resolve = fulfill;
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      suspense(
        html`
          <span class="loading">Loading</span>
        `,
        pending,
      ),
      container,
    );
    expect(container.textContent?.trim()).toBe('Loading');

    render(
      html`
        <i>Newer</i>
      `,
      container,
    );
    resolve(html`
      <strong>Stale</strong>
    `);
    await tick();
    expect(container.textContent?.trim()).toBe('Newer');

    let reject!: (reason: unknown) => void;
    const rejected = new Promise<TemplateResult>((_, fail) => {
      reject = fail;
    });
    render(
      suspense(
        html`
          <span>Fallback</span>
        `,
        rejected,
      ),
      container,
    );
    reject(new Error('failed content'));
    await tick();
    expect(container.textContent?.trim()).toBe('');
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it('resolves Suspense inside a direct-DOM node range', async () => {
    const container = document.createElement('div');
    let resolve!: (value: TemplateResult) => void;
    const pending = new Promise<TemplateResult>((fulfill) => {
      resolve = fulfill;
    });

    render(
      domTemplate(directDefinition(), [
        suspense(
          html`
            <span>Loading</span>
          `,
          pending,
        ),
      ]),
      container,
    );
    expect(container.textContent?.trim()).toBe('Loading');

    resolve(html`
      <strong>Ready</strong>
    `);
    await tick();
    expect(container.textContent?.trim()).toBe('Ready');
  });

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

  it('creates customized built-ins with their `is` value', () => {
    class CustomizedBuiltInElement extends HTMLDivElement {
      upgraded = true;
    }
    if (!customElements.get('mp-customized-built-in')) {
      customElements.define('mp-customized-built-in', CustomizedBuiltInElement, { extends: 'div' });
    }

    const container = document.createElement('div');
    render(dynamicElement('div', { is: 'mp-customized-built-in' }), container);

    expect(container.firstElementChild).toBeInstanceOf(CustomizedBuiltInElement);
    expect((container.firstElementChild as CustomizedBuiltInElement).upgraded).toBe(true);
  });

  it('updates a compatible dynamic element without replacing its node', () => {
    const container = document.createElement('div');
    const firstClicks: string[] = [];
    const secondClicks: string[] = [];

    render(
      dynamicElement(
        'button',
        { '~value': 'first', '?disabled': true, '@click': () => firstClicks.push('first') },
        'first',
      ),
      container,
    );
    const button = container.firstElementChild as HTMLButtonElement;

    render(
      dynamicElement('button', { '~value': 'second', '@click': () => secondClicks.push('second') }, 'second'),
      container,
    );

    expect(container.firstElementChild).toBe(button);
    expect(button.value).toBe('second');
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('second');
    button.dispatchEvent(new Event('click'));
    expect(firstClicks).toEqual([]);
    expect(secondClicks).toEqual(['second']);
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

  it('memoizes values while explicit dependencies remain identical', () => {
    let calls = 0;
    let dependency = { value: 1 };
    const read = memoize(
      () => {
        calls += 1;
        return dependency.value;
      },
      () => [dependency],
    );

    expect(read()).toBe(1);
    expect(read()).toBe(1);
    expect(calls).toBe(1);

    dependency = { value: 2 };
    expect(read()).toBe(2);
    expect(calls).toBe(2);
  });

  it('uses Object.is semantics for memo dependencies', () => {
    let calls = 0;
    let dependency = Number.NaN;
    const read = memoize(
      () => {
        calls += 1;
        return calls;
      },
      () => [dependency],
    );

    expect(read()).toBe(1);
    expect(read()).toBe(1);
    dependency = 0;
    expect(read()).toBe(2);
    dependency = -0;
    expect(read()).toBe(3);
    expect(calls).toBe(3);
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
    const Reader = contextReader(context);
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

  it('updates dynamic providers and components in place with the active context', () => {
    const context = createContext('default');
    const Reader = contextReader(context);
    const container = document.createElement('div');
    const view = (value: string): DomRenderResult =>
      dynamicElement(context.Provider, { '~value': value }, dynamicElement(Reader, {}));

    render(view('first'), container);
    const span = container.querySelector('span');
    render(view('second'), container);

    expect(container.querySelector('span')).toBe(span);
    expect(container.textContent?.trim()).toBe('second');
    expect(useContext(context)).toBe('default');
  });

  it('tracks current nodes for dynamic components whose array output changes shape', () => {
    const Component = dynamicShapeComponent;
    const container = document.createElement('div');
    const view = (shape: DynamicShape): TemplateResult => html`
      ${[dynamicElement(Component, { shape })]}
    `;

    render(view('span'), container);
    expect(container.querySelector('span')?.textContent).toBe('span');

    render(view('div'), container);

    expect(container.querySelectorAll('span')).toHaveLength(0);
    expect(container.querySelectorAll('div')).toHaveLength(1);
    expect(container.textContent?.trim()).toBe('div');
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

    render(conditionalRangeView(false), container);
    render(conditionalRangeView(true), container);

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
  it('constructs direct DOM once and updates the existing node range', () => {
    const container = document.createElement('div');
    const definition = directDefinition();
    render(domTemplate(definition, ['first']), container);
    const section = container.firstElementChild;

    render(domTemplate(definition, ['second']), container);

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

    render(domTemplate(definition, ['first']), container);
    const child = container.querySelector('mp-generated-child') as GeneratedChildElement;
    render(domTemplate(definition, ['second']), container);

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

    render(domTemplate(directDefinition, [handler]), directContainer);
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

    render(domTemplate(definition, []), container);

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

    render(domTemplate(definition, ['before', handler, reference]), container);
    const oldButton = container.querySelector('button') as HTMLButtonElement;
    render(HtmlContent({ as: 'section', html: '<span>trusted</span>' }), container);
    expect(oldButton.isConnected).toBe(false);
    expect(reference.current).toBeNull();
    oldButton.click();
    expect(calls).toEqual([]);

    render(domTemplate(definition, ['after', handler, reference]), container);
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
    render(domTemplate(definition, ['click', handler, reference]), container);
    const button = container.querySelector('button') as HTMLButtonElement;
    expect(reference.current).toBe(button);

    render(domTemplate(definition, ['updated', handler, reference]), container);
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
