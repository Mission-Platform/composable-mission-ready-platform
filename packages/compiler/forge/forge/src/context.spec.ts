import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { toReactComponent } from './adapters/react';
import { createContext as createVueContext, renderToVue, toVueComponent } from './adapters/vue';
import { createContext, h, type MpComponent, type MpElement, useContext } from './runtime';

const ThemeContext = createContext('light');

/** A deep consumer reading the context value via `useContext`. */
const ThemedButton: MpComponent = () => {
  const theme = useContext(ThemeContext);
  return h('button', { class: `btn btn--${theme}` }, theme);
};

/** An intermediate wrapper that does not thread the value through its props. */
const Toolbar: MpComponent = () => h('div', { class: 'toolbar' }, h(ThemedButton, {}));

/** A provider supplying a value to the (arbitrarily deep) subtree. */
const App: MpComponent<{ theme?: string }> = (properties) =>
  h(ThemeContext.Provider, { value: properties.theme ?? 'light' }, h(Toolbar, {}));

describe('the neutral context primitive', () => {
  it('throws if a Provider is rendered directly (it is a compile-time / adapter marker)', () => {
    expect(() => (ThemeContext.Provider as () => unknown)()).toThrow(/must not be rendered directly/);
  });

  it('resolves a provided value through a deep subtree identically on both adapters', async () => {
    const properties = { theme: 'dark' };
    const react = renderToStaticMarkup(createElement(toReactComponent(App), properties));
    const warnings: string[] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation((...arguments_) => {
      warnings.push(arguments_.join(' '));
    });
    let vue: string;
    try {
      vue = await renderToString(createSSRApp(toVueComponent(App), properties));
    } finally {
      warn.mockRestore();
    }

    for (const html of [react, vue]) {
      expect(html).toContain('btn--dark');
      expect(html).toContain('>dark</button>');
    }
    expect(warnings.some((warning) => warning.includes('Non-function value encountered for default slot'))).toBe(false);
  });

  it('passes neutral children to rewritten Vue components as function slots', async () => {
    const Provider = createVueContext('light').Provider;
    const tree = h(Provider as unknown as MpElement['type'], { value: 'dark' }, h('span', {}, 'dark'));
    const warnings: string[] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation((...arguments_) => {
      warnings.push(arguments_.join(' '));
    });

    let html: string;
    try {
      html = await renderToString(createSSRApp({ render: () => renderToVue(tree) }));
    } finally {
      warn.mockRestore();
    }

    expect(html).toContain('<span>dark</span>');
    expect(warnings.some((warning) => warning.includes('Non-function value encountered for default slot'))).toBe(false);
  });

  it('falls back to the default value when no Provider is above the reader', async () => {
    const react = renderToStaticMarkup(createElement(toReactComponent(Toolbar), {}));
    const vue = await renderToString(createSSRApp(toVueComponent(Toolbar), {}));

    for (const html of [react, vue]) {
      expect(html).toContain('btn--light');
    }
  });

  it('leaves no value on the provide stack after rendering', async () => {
    await renderToString(createSSRApp(toVueComponent(App), { theme: 'dark' }));
    expect(useContext(ThemeContext)).toBe('light');
  });
});
