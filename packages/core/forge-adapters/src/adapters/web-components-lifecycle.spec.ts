// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  idNumber,
  PreUpgradeElement,
  CounterElement,
  UpdatedCallbackElement,
  StyledElement,
  ControlledInputElement,
  ControlledTextareaElement,
  DynamicRootElement,
  mountCounter,
  tick,
} from './web-components-fixtures.js';
import { ForgeElement, html, nothing, useId } from './web-components.js';

import type { TemplateResult } from './web-components.js';

afterEach(() => {
  document.body.replaceChildren();
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
  it('updates dynamic roots in place and replaces them when the tag changes', async () => {
    const element = document.createElement('mp-dynamic-root-test') as DynamicRootElement;
    document.body.append(element);
    const firstButton = element.forgeRenderRoot?.querySelector('button');

    expect(firstButton?.textContent).toBe('first');
    element.value = 'second';
    await tick();

    expect(element.forgeRenderRoot?.querySelector('button')).toBe(firstButton);
    expect((firstButton as HTMLButtonElement).value).toBe('second');
    expect(firstButton?.textContent).toBe('second');
    firstButton?.dispatchEvent(new Event('click'));
    expect(element.clicks).toEqual(['second']);

    element.tag = 'span';
    await tick();

    const span = element.forgeRenderRoot?.querySelector('span');
    expect(span).not.toBeNull();
    expect(span).not.toBe(firstButton);
    expect(firstButton?.isConnected).toBe(false);
    firstButton?.dispatchEvent(new Event('click'));
    expect(element.clicks).toEqual(['second']);
  });

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

describe('kebab-case HTML attribute observation and mapping', () => {
  class KebabAttributeElement extends ForgeElement {
    static readonly properties = {
      modelValue: {},
      tabIndexValue: { type: Number },
      count: { state: true },
    };

    declare modelValue?: string;
    declare tabIndexValue?: number;
    declare count: number;

    render(): TemplateResult {
      return html`
        <span class="value">${this.modelValue}</span>
        <span class="tab">${this.tabIndexValue}</span>
      `;
    }
  }
  if (!customElements.get('mp-kebab-observation-test')) {
    customElements.define('mp-kebab-observation-test', KebabAttributeElement);
  }

  it('registers both lowercase and kebab-case attribute names in observedAttributes', () => {
    expect(KebabAttributeElement.observedAttributes).toContain('modelvalue');
    expect(KebabAttributeElement.observedAttributes).toContain('model-value');
    expect(KebabAttributeElement.observedAttributes).toContain('tabindexvalue');
    expect(KebabAttributeElement.observedAttributes).toContain('tab-index-value');
    // State properties must not be observed
    expect(KebabAttributeElement.observedAttributes).not.toContain('count');
  });

  it('adopts kebab-case HTML attributes on connection', async () => {
    const element = document.createElement('mp-kebab-observation-test') as KebabAttributeElement;
    element.setAttribute('model-value', 'hello-kebab');
    element.setAttribute('tab-index-value', '5');
    document.body.append(element);
    await tick();

    expect(element.modelValue).toBe('hello-kebab');
    expect(element.tabIndexValue).toBe(5);
    expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('hello-kebab');
    expect(element.shadowRoot?.querySelector('.tab')?.textContent).toBe('5');
  });

  it('adopts lowercase HTML attributes on connection', async () => {
    const element = document.createElement('mp-kebab-observation-test') as KebabAttributeElement;
    element.setAttribute('modelvalue', 'hello-lower');
    document.body.append(element);
    await tick();

    expect(element.modelValue).toBe('hello-lower');
    expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('hello-lower');
  });

  it('updates reactive property and schedules re-render when kebab-case attribute mutates', async () => {
    const element = document.createElement('mp-kebab-observation-test') as KebabAttributeElement;
    document.body.append(element);
    await tick();

    element.setAttribute('model-value', 'updated-kebab');
    expect(element.modelValue).toBe('updated-kebab');
    await tick();

    expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('updated-kebab');
  });

  it('updates reactive property and schedules re-render when lowercase attribute mutates', async () => {
    const element = document.createElement('mp-kebab-observation-test') as KebabAttributeElement;
    document.body.append(element);
    await tick();

    element.setAttribute('modelvalue', 'updated-lower');
    expect(element.modelValue).toBe('updated-lower');
    await tick();

    expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('updated-lower');
  });
});

describe('bi-directional property-to-attribute reflection', () => {
  class ReflectStringElement extends ForgeElement {
    static readonly properties = {
      modelValue: { reflect: true },
      customProp: { attribute: 'custom-attribute', reflect: true },
    };

    declare modelValue?: string;
    declare customProp?: string;

    render(): TemplateResult {
      return html`
        <span>${this.modelValue}</span>
      `;
    }
  }
  if (!customElements.get('mp-reflect-string-test')) {
    customElements.define('mp-reflect-string-test', ReflectStringElement);
  }

  class ReflectBooleanElement extends ForgeElement {
    static readonly properties = {
      checked: { type: Boolean, reflect: true },
    };

    declare checked?: boolean;

    render(): TemplateResult {
      return html`
        <span class="checked">${this.checked ? 'yes' : 'no'}</span>
      `;
    }
  }
  if (!customElements.get('mp-reflect-boolean-test')) {
    customElements.define('mp-reflect-boolean-test', ReflectBooleanElement);
  }

  class ReflectInitialElement extends ForgeElement {
    static readonly properties = {
      titleText: { reflect: true },
    };

    declare titleText?: string;

    constructor() {
      super();
      this.titleText = 'initial-title';
    }

    render(): TemplateResult {
      return html`
        <span>${this.titleText}</span>
      `;
    }
  }
  if (!customElements.get('mp-reflect-initial-test')) {
    customElements.define('mp-reflect-initial-test', ReflectInitialElement);
  }

  it('reflects property assignment to kebab-case DOM attribute', () => {
    const element = new ReflectStringElement();
    document.body.append(element);

    element.modelValue = 'reflected-value';
    expect(element.getAttribute('model-value')).toBe('reflected-value');
    expect(element.modelValue).toBe('reflected-value');
  });

  it('removes DOM attribute when property is set to undefined or null', () => {
    const element = new ReflectStringElement();
    document.body.append(element);

    element.modelValue = 'temp';
    expect(element.hasAttribute('model-value')).toBe(true);

    element.modelValue = undefined;
    expect(element.hasAttribute('model-value')).toBe(false);
  });

  it('reflects property with custom attribute name', () => {
    const element = new ReflectStringElement();
    document.body.append(element);

    element.customProp = 'custom-value';
    expect(element.getAttribute('custom-attribute')).toBe('custom-value');
    expect(element.customProp).toBe('custom-value');
  });

  it('handles boolean property reflection in both directions', async () => {
    const element = new ReflectBooleanElement();
    document.body.append(element);
    await tick();

    // Setting property to true reflects as boolean attribute
    element.checked = true;
    expect(element.hasAttribute('checked')).toBe(true);
    expect(element.getAttribute('checked')).toBe('');
    await tick();
    expect(element.shadowRoot?.querySelector('.checked')?.textContent).toBe('yes');

    // Setting property to false removes boolean attribute
    element.checked = false;
    expect(element.hasAttribute('checked')).toBe(false);
    await tick();
    expect(element.shadowRoot?.querySelector('.checked')?.textContent).toBe('no');

    // Setting attribute reflects back to property
    element.setAttribute('checked', '');
    expect(element.checked).toBe(true);
    await tick();
    expect(element.shadowRoot?.querySelector('.checked')?.textContent).toBe('yes');

    // Removing attribute reflects back to property
    element.removeAttribute('checked');
    expect(element.checked).toBe(false);
    await tick();
    expect(element.shadowRoot?.querySelector('.checked')?.textContent).toBe('no');
  });

  it('reflects constructor-seeded property to DOM attribute', () => {
    const element = new ReflectInitialElement();
    expect(element.getAttribute('title-text')).toBe('initial-title');

    document.body.append(element);
    expect(element.getAttribute('title-text')).toBe('initial-title');
  });

  it('does not produce infinite loop when attribute and property are synchronized', () => {
    const element = new ReflectStringElement();
    document.body.append(element);

    element.setAttribute('model-value', 'first');
    expect(element.modelValue).toBe('first');

    element.modelValue = 'second';
    expect(element.getAttribute('model-value')).toBe('second');

    element.setAttribute('model-value', 'third');
    expect(element.modelValue).toBe('third');
  });
});

describe('ElementInternals form association and lifecycle hooks', () => {
  const formValues: Array<string | File | FormData | null> = [];
  const validityRecords: Array<{ flags: ValidityStateFlags; message: string }> = [];
  let formAssociatedCalls: Array<HTMLFormElement | null> = [];
  const statesSet = new Set<string>();

  const mockInternals = {
    setFormValue: (value: string | File | FormData | null) => formValues.push(value),
    setValidity: (flags: ValidityStateFlags, message: string) => validityRecords.push({ flags, message }),
    validity: {
      badInput: false,
      customError: false,
      patternMismatch: false,
      rangeOverflow: false,
      rangeUnderflow: false,
      stepMismatch: false,
      tooLong: false,
      tooShort: false,
      typeMismatch: false,
      valid: true,
      valueMissing: false,
    },
    validationMessage: 'Validation message',
    willValidate: true,
    checkValidity: () => true,
    reportValidity: () => true,
    states: statesSet,
    form: undefined as unknown as HTMLFormElement | null,
    labels: undefined as unknown as NodeList | null,
  } as unknown as ElementInternals;

  class ComprehensiveFormElement extends ForgeElement {
    static readonly formAssociated = true;
    static readonly internals = { attach: true, formAssociated: true };
    static readonly properties = {
      modelValue: { reflect: true },
      disabled: { type: Boolean, reflect: true },
    };

    declare modelValue?: string;
    declare disabled?: boolean;

    attachInternals(): ElementInternals {
      return mockInternals;
    }

    formAssociatedCallback(form: HTMLFormElement | null): void {
      super.formAssociatedCallback(form);
      formAssociatedCalls.push(form);
    }

    render(): TemplateResult {
      return html`
        <span class="value">${this.modelValue}</span>
      `;
    }
  }
  if (!customElements.get('mp-comprehensive-form-test')) {
    customElements.define('mp-comprehensive-form-test', ComprehensiveFormElement);
  }

  it('exposes standard validity and form getters from ElementInternals', () => {
    const element = new ComprehensiveFormElement();
    document.body.append(element);

    expect(element.validity.valid).toBe(true);
    expect(element.validationMessage).toBe('Validation message');
    expect(element.willValidate).toBe(true);
    expect(element.checkValidity()).toBe(true);
    expect(element.reportValidity()).toBe(true);
  });

  it('forwards reactive property updates to setFormValue', () => {
    formValues.length = 0;
    const element = new ComprehensiveFormElement();
    document.body.append(element);

    element.modelValue = 'initial-value';
    expect(formValues).toContain('initial-value');

    element.modelValue = 'second-value';
    expect(formValues.at(-1)).toBe('second-value');
  });

  it('manages custom state sets via setCustomState', () => {
    statesSet.clear();
    const element = new ComprehensiveFormElement();
    document.body.append(element);

    element.setCustomState('checked', true);
    expect(statesSet.has('checked') || statesSet.has('--checked')).toBe(true);

    element.setCustomState('checked', false);
    expect(statesSet.has('checked')).toBe(false);
  });

  it('invokes formDisabledCallback and sets custom state on disabled update', () => {
    statesSet.clear();
    const element = new ComprehensiveFormElement();
    document.body.append(element);

    element.formDisabledCallback(true);
    expect(element.disabled).toBe(true);
    expect(statesSet.has('disabled') || statesSet.has('--disabled')).toBe(true);

    element.formDisabledCallback(false);
    expect(element.disabled).toBe(false);
    expect(statesSet.has('disabled')).toBe(false);
  });

  it('invokes formAssociatedCallback when connected and disconnected', () => {
    formAssociatedCalls = [];
    const form = document.createElement('form');
    const element = new ComprehensiveFormElement();
    form.append(element);
    document.body.append(form);

    expect(formAssociatedCalls.length).toBeGreaterThanOrEqual(1);
    expect(formAssociatedCalls[0]).toBe(form);

    element.remove();
    expect(formAssociatedCalls.at(-1)).toBeNull();
  });

  it('resets component value on formResetCallback', () => {
    const element = new ComprehensiveFormElement();
    element.setAttribute('model-value', 'original');
    document.body.append(element);

    element.modelValue = 'modified';
    expect(element.modelValue).toBe('modified');

    element.formResetCallback();
    expect(element.modelValue).toBe('original');
  });

  it('resets component value when parent form is reset', () => {
    const form = document.createElement('form');
    const element = new ComprehensiveFormElement();
    element.setAttribute('model-value', 'reset-target');
    form.append(element);
    document.body.append(form);

    element.modelValue = 'dirty-value';
    expect(element.modelValue).toBe('dirty-value');

    form.reset();
    expect(element.modelValue).toBe('reset-target');
  });
});
