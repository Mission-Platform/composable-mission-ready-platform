/**
 * Cross-framework **SSR DOM parity** test helper.
 *
 * Each write-once component in this package is authored once in the neutral
 * `@mission-platform/forge` dialect and shipped to **both** React and Vue. This
 * helper renders a neutral component through the `@mission-platform/forge` React
 * and Vue runtime adapters to static SSR markup and lets a `<name>.spec.ts`
 * assert the two frameworks produce the **same DOM** for a given prop set —
 * proving the component is framework-portable independently of the build-time
 * compiler (whose own React/Vue parity is covered in
 * `@mission-platform/vite-plugin-forge`).
 *
 * Usage:
 *
 * ```ts
 * import { expectSsrParity } from '../../test-utils/ssr-parity';
 * import { ForgeBadge } from './forge-badge';
 *
 * it('renders identically on React and Vue', async () => {
 *   const { html } = await expectSsrParity(ForgeBadge, { variant: 'primary' }, 'New');
 *   expect(html).toContain('forge-badge--primary');
 * });
 * ```
 */
import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import type { MpChild, MpComponent, MpProperties } from '@mission-platform/forge';

/** Children accepted by the parity helpers (plain text/markup only for SSR). */
export type ParityChildren = string | number | undefined;

/**
 * Normalises SSR markup so the React and Vue outputs can be compared for DOM
 * equivalence rather than byte equality:
 *
 *  - strips framework-specific comment anchors (Vue emits `<!---->` for empty
 *    fragments/teleports; React does not),
 *  - collapses insignificant whitespace between tags,
 *  - sorts the attributes within every start tag,
 *  - normalises self-closing/void tags.
 */
export function normalizeMarkup(html: string): string {
  return (
    html
      // Drop comment anchors (Vue fragment/teleport markers).
      .replaceAll(/<!--[\s\S]*?-->/g, '')
      // Sort attributes inside every start tag for order-independent comparison.
      .replaceAll(
        /<([a-zA-Z][\w-]*)((?:\s+[^<>]*?)?)\s*(\/?)>/g,
        (_match, tag: string, attributes: string, selfClose: string) => {
          const parts = attributes.match(/[\w-]+(?:="[^"]*"|='[^']*')?/g) ?? [];
          parts.sort();
          const rendered = parts.length > 0 ? ` ${parts.join(' ')}` : '';
          return `<${tag}${rendered}${selfClose ? ' /' : ''}>`;
        },
      )
      // Collapse whitespace between tags and trim.
      .replaceAll(/>\s+</g, '><')
      .replaceAll(/\s{2,}/g, ' ')
      .trim()
  );
}

/** Render a neutral component to static React SSR markup. */
export function renderReactSsr<P extends MpProperties>(
  component: MpComponent<P>,
  properties: Partial<P> = {},
  children?: ParityChildren,
): string {
  const ReactComponent = toReactComponent(component, component.name || 'MpComponent');
  return renderToStaticMarkup(
    createElement(ReactComponent, properties as Record<string, unknown>, children as ReactNode),
  );
}

/** Render a neutral component to Vue SSR markup. */
export async function renderVueSsr<P extends MpProperties>(
  component: MpComponent<P>,
  properties: Partial<P> = {},
  children?: ParityChildren,
): Promise<string> {
  const VueComponent = toVueComponent(component, component.name || 'MpComponent');
  const slots = children === undefined ? undefined : { default: () => children as unknown as MpChild };
  return renderToString(
    createSSRApp({
      render: () => vueH(VueComponent, properties as Record<string, unknown>, slots),
    }),
  );
}

/**
 * Render a neutral component on both frameworks and assert the normalised SSR
 * markup matches. Returns both the raw React/Vue markup and the shared
 * normalised markup so the caller can make further `toContain` assertions.
 */
export async function expectSsrParity<P extends MpProperties>(
  component: MpComponent<P>,
  properties: Partial<P> = {},
  children?: ParityChildren,
): Promise<{ react: string; vue: string; html: string }> {
  const react = renderReactSsr(component, properties, children);
  const vue = await renderVueSsr(component, properties, children);
  const normalizedReact = normalizeMarkup(react);
  const normalizedVue = normalizeMarkup(vue);
  expect(normalizedVue, 'Vue SSR markup should match React SSR markup').toBe(normalizedReact);
  return { react, vue, html: normalizedReact };
}
