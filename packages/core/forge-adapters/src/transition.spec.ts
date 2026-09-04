import { h, type MpComponent, Transition, TransitionGroup } from '@mission-platform/forge-jsx/runtime';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';

import {
  toReactComponent,
  Transition as ReactTransition,
  TransitionGroup as ReactTransitionGroup,
} from './adapters/react';
import { toVueComponent } from './adapters/vue';

/** A neutral component that transitions a panel when "open". */
const Fade: MpComponent = (properties) =>
  h(
    'div',
    { class: 'wrap' },
    properties.open ? h(Transition, { name: 'fade' }, h('span', { class: 'panel' }, 'content')) : undefined,
  );

describe('the neutral `Transition` marker', () => {
  it('throws if rendered directly (it is a compile-time / adapter marker)', () => {
    expect(() => (Transition as () => unknown)()).toThrow(/must not be rendered directly/);
  });

  it('renders its child in place on both adapters (SSR parity)', async () => {
    const properties = { open: true };
    const react = renderToStaticMarkup(createElement(toReactComponent(Fade), properties));
    const vue = await renderToString(createSSRApp(toVueComponent(Fade), properties));

    for (const html of [react, vue]) {
      expect(html).toContain('<span class="panel">content</span>');
      expect(html).toContain('<div class="wrap">');
    }
  });

  it('omits the transitioned content when closed on both adapters', async () => {
    const properties = { open: false };
    const react = renderToStaticMarkup(createElement(toReactComponent(Fade), properties));
    const vue = await renderToString(createSSRApp(toVueComponent(Fade), properties));

    for (const html of [react, vue]) {
      expect(html).not.toContain('panel');
    }
  });
});

describe('the React `Transition` component', () => {
  it('renders its child in place during SSR (the animation only runs after mount)', () => {
    const html = renderToStaticMarkup(
      createElement(ReactTransition, { name: 'fade' }, createElement('div', { className: 'panel' }, 'content')),
    );

    expect(html).toBe('<div class="panel">content</div>');
  });

  it('renders nothing when it has no child', () => {
    const html = renderToStaticMarkup(createElement(ReactTransition, { name: 'fade' }));

    expect(html).toBe('');
  });
});

/**
 * A neutral component that transitions a panel with **explicit, scoped**
 * transition classes (the substitute for hashed CSS-Module names) instead of a
 * `name` prefix — the opt-out from global `<name>-*` transition classes.
 */
const ScopedFade: MpComponent = (properties) =>
  h(
    'div',
    { class: 'wrap' },
    properties.open
      ? h(
          Transition,
          {
            enterFromClass: '_fade-enter-from_hash',
            enterActiveClass: '_fade-enter-active_hash',
            leaveActiveClass: '_fade-leave-active_hash',
            leaveToClass: '_fade-leave-to_hash',
          },
          h('span', { class: 'panel' }, 'content'),
        )
      : undefined,
  );

describe('the `Transition` explicit transition-class props', () => {
  it('are accepted by both adapters and still render the child in place (SSR parity)', async () => {
    const properties = { open: true };
    const react = renderToStaticMarkup(createElement(toReactComponent(ScopedFade), properties));
    const vue = await renderToString(createSSRApp(toVueComponent(ScopedFade), properties));

    for (const html of [react, vue]) {
      expect(html).toContain('<span class="panel">content</span>');
      // The transition classes are applied by the live-DOM driver after mount,
      // never in the SSR output, so the scoped names must not leak into the markup.
      expect(html).not.toContain('_fade-enter');
      expect(html).not.toContain('_fade-leave');
    }
  });

  it('renders the child in place during SSR on the React driver', () => {
    const html = renderToStaticMarkup(
      createElement(
        ReactTransition,
        { enterActiveClass: '_fade-enter-active_hash', leaveActiveClass: '_fade-leave-active_hash' },
        createElement('div', { className: 'panel' }, 'content'),
      ),
    );

    expect(html).toBe('<div class="panel">content</div>');
  });
});

/** A neutral component that transitions a keyed list of items. */
const List: MpComponent<{ items?: { id: number; label: string }[] }> = (properties) =>
  h(
    'ul',
    { class: 'list' },
    h(
      TransitionGroup,
      { name: 'fade' },
      ...(properties.items ?? []).map((item) => h('li', { key: item.id, class: 'item' }, item.label)),
    ),
  );

describe('the neutral `TransitionGroup` marker', () => {
  it('throws if rendered directly (it is a compile-time / adapter marker)', () => {
    expect(() => (TransitionGroup as () => unknown)()).toThrow(/must not be rendered directly/);
  });

  it('renders its keyed children in place on both adapters (SSR parity)', async () => {
    const properties = {
      items: [
        { id: 1, label: 'one' },
        { id: 2, label: 'two' },
      ],
    };
    const react = renderToStaticMarkup(createElement(toReactComponent(List), properties));
    const vue = await renderToString(createSSRApp(toVueComponent(List), properties));

    for (const html of [react, vue]) {
      expect(html).toContain('<li class="item">one</li>');
      expect(html).toContain('<li class="item">two</li>');
      expect(html).toContain('<ul class="list">');
    }
  });
});

describe('the React `TransitionGroup` component', () => {
  it('renders its children in place during SSR (the animation only runs after mount)', () => {
    const html = renderToStaticMarkup(
      createElement(
        ReactTransitionGroup,
        { name: 'fade' },
        createElement('li', { key: 'a', className: 'item' }, 'a'),
        createElement('li', { key: 'b', className: 'item' }, 'b'),
      ),
    );

    expect(html).toBe('<li class="item">a</li><li class="item">b</li>');
  });

  it('wraps the list in the given `tag` element', () => {
    const html = renderToStaticMarkup(
      createElement(
        ReactTransitionGroup,
        { name: 'fade', tag: 'ul' },
        createElement('li', { key: 'a', className: 'item' }, 'a'),
      ),
    );

    expect(html).toBe('<ul><li class="item">a</li></ul>');
  });

  it('renders an empty list with no wrapper as nothing', () => {
    const html = renderToStaticMarkup(createElement(ReactTransitionGroup, { name: 'fade' }));

    expect(html).toBe('');
  });
});
