import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeSelect } from './forge-select';

/**
 * Exercises the **neutral** `ForgeSelect` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * Covers the combobox trigger, the hidden native select, and the error
 * association. The option listbox is rendered through `ForgeDropdown`, whose
 * panel is mounted only while open, so the closed (default) SSR render exposes
 * the option labels through the always-present native `<select>` rather than a
 * `role="listbox"`.
 */
const ReactSelect = toReactComponent(ForgeSelect, 'Select');
const VueSelect = toVueComponent(ForgeSelect, 'Select');

const noop = (): void => {};

const OPTIONS = [
  { label: 'Red', value: 'red' },
  { label: 'Green', value: 'green' },
  { label: 'Blue', value: 'blue', disabled: true },
];

describe('ForgeSelect authors the same component for React and Vue', () => {
  it('renders the combobox trigger and the option labels on both frameworks', async () => {
    const properties = { options: OPTIONS, label: 'Colour', modelValue: 'green', id: 'sel-1' };
    const react = renderToStaticMarkup(createElement(ReactSelect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSelect, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="combobox"');
      // The selected option's label shows in the trigger.
      expect(html).toContain('Green');
      // Every option appears (in the hidden native select while the dropdown is closed).
      expect(html).toContain('Red');
      expect(html).toContain('Blue');
      // The dropdown is closed by default, so its listbox panel is not mounted.
      expect(html).not.toContain('role="listbox"');
      expect(html).toContain('aria-expanded="false"');
    }
  });

  it('mirrors the value into the hidden native select on both frameworks', async () => {
    const properties = { options: OPTIONS, modelValue: 'green', name: 'colour', id: 'sel-2' };
    const react = renderToStaticMarkup(createElement(ReactSelect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSelect, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('name="colour"');
      // The selected option's label is shown in the combobox trigger.
      expect(html).toContain('Green');
    }
  });

  it('shows the placeholder when nothing is selected on both frameworks', async () => {
    const properties = { options: OPTIONS, placeholder: 'Choose a colour', id: 'sel-3' };
    const react = renderToStaticMarkup(createElement(ReactSelect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSelect, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Choose a colour');
    }
  });

  it('wires the error message via aria-describedby on both frameworks', async () => {
    const properties = { options: OPTIONS, error: 'Selection required', id: 'sel-4' };
    const react = renderToStaticMarkup(createElement(ReactSelect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSelect, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Selection required');
      expect(html).toContain('aria-describedby="sel-4-error"');
      expect(html).toContain('role="alert"');
    }
  });

  it('renders a searchable text input carrying the selected label by default on both frameworks', async () => {
    const properties = { options: OPTIONS, modelValue: 'green', id: 'sel-5' };
    const react = renderToStaticMarkup(createElement(ReactSelect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSelect, properties) }));

    for (const html of [react, vue]) {
      // The trigger is a filtering text field (combobox with list autocomplete).
      expect(html).toContain('aria-autocomplete="list"');
      // The selected option's label seeds the search field so it shows the value.
      expect(html).toContain('value="Green"');
    }
  });

  it('falls back to a plain button trigger when searchable is disabled on both frameworks', async () => {
    const properties = { options: OPTIONS, modelValue: 'green', searchable: false, id: 'sel-6' };
    const react = renderToStaticMarkup(createElement(ReactSelect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSelect, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('type="button"');
      expect(html).not.toContain('aria-autocomplete="list"');
      // The selected option's label shows in the button trigger.
      expect(html).toContain('Green');
    }
  });

  it('displays a loading indicator when loading is true', () => {
    const properties = { options: OPTIONS, loading: true, id: 'sel-loading' };
    const react = renderToStaticMarkup(createElement(ReactSelect, properties));
    expect(react).toContain('role="status"');
    expect(react).toContain('aria-label="Loading…"');
    expect(react).toContain('aria-busy="true"');
  });

  it('triggers onSearch when input text changes in searchable mode', async () => {
    const onSearch = vi.fn().mockResolvedValue([
      { label: 'Dynamic Option 1', value: 'dyn1' },
      { label: 'Dynamic Option 2', value: 'dyn2' },
    ]);
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        vueH(VueSelect, {
          id: 'async-select',
          options: OPTIONS,
          searchDebounceMs: 0,
          onSearch,
        }),
    });
    app.mount(host);

    const input = host.querySelector('input');
    expect(input).not.toBeNull();
    if (input) {
      input.value = 'dyn';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await nextTick();
      expect(onSearch).toHaveBeenCalledWith('dyn');
    }
    app.unmount();
    host.remove();
  });

  it('debounces onSearch queries when searchDebounceMs is set', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn().mockResolvedValue([]);
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        vueH(VueSelect, {
          id: 'debounce-select',
          options: OPTIONS,
          searchDebounceMs: 250,
          onSearch,
        }),
    });
    app.mount(host);

    const input = host.querySelector('input');
    if (input) {
      input.value = 'a';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.value = 'ab';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.value = 'abc';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(onSearch).not.toHaveBeenCalled();
      vi.advanceTimersByTime(250);
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('abc');
    }

    vi.useRealTimers();
    app.unmount();
    host.remove();
  });

  it('cancels pending search responses when closed before resolution', async () => {
    let resolveSearch: (value: Array<{ label: string; value: string }>) => void = noop;
    const pendingPromise = new Promise<Array<{ label: string; value: string }>>((resolve) => {
      resolveSearch = resolve;
    });
    const onSearch = vi.fn().mockReturnValue(pendingPromise);

    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        vueH(VueSelect, {
          id: 'cancel-select',
          options: OPTIONS,
          searchDebounceMs: 0,
          onSearch,
        }),
    });
    app.mount(host);

    const input = host.querySelector('input');
    expect(input).not.toBeNull();
    if (input) {
      input.value = 'test';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(onSearch).toHaveBeenCalledWith('test');

      // Close dropdown by pressing Escape
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await nextTick();

      // Resolve the pending promise after close
      resolveSearch([{ label: 'Delayed Result', value: 'delayed' }]);
      await nextTick();

      // Reopen dropdown
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await nextTick();

      // Options should not contain the stale delayed result
      const optionElements = host.querySelectorAll('li[role="option"]');
      const texts = [...optionElements].map((element) => element.textContent?.trim());
      expect(texts).not.toContain('Delayed Result');
    }

    app.unmount();
    host.remove();
  });

  it('cancels debounce timer when dropdown is closed before timer fires', async () => {
    vi.useFakeTimers();
    const onSearch = vi.fn().mockResolvedValue([]);
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        vueH(VueSelect, {
          id: 'cancel-debounce-select',
          options: OPTIONS,
          searchDebounceMs: 250,
          onSearch,
        }),
    });
    app.mount(host);

    const input = host.querySelector('input');
    expect(input).not.toBeNull();
    if (input) {
      input.value = 'query';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Close before timer fires
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await nextTick();

      vi.advanceTimersByTime(300);
      expect(onSearch).not.toHaveBeenCalled();
    }

    vi.useRealTimers();
    app.unmount();
    host.remove();
  });

  it('cancels in-flight search requests on component unmount', async () => {
    let resolveSearch: (value: Array<{ label: string; value: string }>) => void = noop;
    const pendingPromise = new Promise<Array<{ label: string; value: string }>>((resolve) => {
      resolveSearch = resolve;
    });
    const onSearch = vi.fn().mockReturnValue(pendingPromise);

    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        vueH(VueSelect, {
          id: 'unmount-select',
          options: OPTIONS,
          searchDebounceMs: 0,
          onSearch,
        }),
    });
    app.mount(host);

    const input = host.querySelector('input');
    expect(input).not.toBeNull();
    if (input) {
      input.value = 'unmount-test';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(onSearch).toHaveBeenCalledWith('unmount-test');
    }

    // Unmount while request is pending
    app.unmount();
    host.remove();

    // Resolving after unmount should not throw or cause errors
    expect(() => {
      resolveSearch([{ label: 'Unmounted Result', value: 'unmounted' }]);
    }).not.toThrow();
    await nextTick();
  });

  it('renders loading item with role="option" inside listbox and status outside listbox when loading and open', async () => {
    const properties = { options: OPTIONS, loading: true, open: true, id: 'loading-a11y-select' };
    const react = renderToStaticMarkup(createElement(ReactSelect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSelect, properties) }));

    for (const html of [react, vue]) {
      // Trigger has aria-busy and status role outside listbox
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="Loading…"');
      expect(html).toContain('aria-busy="true"');

      // The listbox must be rendered when open
      expect(html).toContain('role="listbox"');

      // The loading indicator item inside the listbox must use role="option" with aria-disabled="true"
      expect(html).toContain('role="option"');
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain('Loading…');
    }

    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        vueH(VueSelect, {
          id: 'loading-a11y-select-dom',
          options: OPTIONS,
          loading: true,
          open: true,
        }),
    });
    app.mount(host);

    const input = host.querySelector('input');
    expect(input).not.toBeNull();
    if (input) {
      expect(input.getAttribute('aria-busy')).toBe('true');
      const statusElement = host.querySelector('[role="status"]');
      expect(statusElement).not.toBeNull();
      expect(statusElement?.getAttribute('aria-label')).toBe('Loading…');

      // The listbox must NOT contain any element with role="status"
      const listbox = document.body.querySelector('ul[role="listbox"]');
      expect(listbox).not.toBeNull();
      if (listbox) {
        expect(listbox.querySelector('[role="status"]')).toBeNull();

        // The loading indicator item inside the listbox must use role="option" with aria-disabled="true"
        const loadingOption = listbox.querySelector('li[role="option"][aria-disabled="true"]');
        expect(loadingOption).not.toBeNull();
        expect(loadingOption?.textContent).toContain('Loading…');
      }
    }

    app.unmount();
    host.remove();
  });
});
