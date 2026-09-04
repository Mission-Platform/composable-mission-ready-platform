/**
 * Cross-framework SSR DOM parity helper for residual neutral components.
 *
 * The helper keeps component tests independent from the Forge build compiler by
 * rendering the same neutral source through the React and Vue runtime adapters.
 */
import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import type { MpChild, MpComponent, MpPropertyBag } from '@mission-platform/forge-jsx';

export type ParityChildren = string | number | undefined;

export function normalizeMarkup(html: string): string {
  return html
    .replaceAll(/<!--[\s\S]*?-->/g, '')
    .replaceAll(
      /<([a-zA-Z][\w-]*)((?:\s+[^<>]*?)?)\s*(\/?)>/g,
      (_match, tag: string, attributes: string, selfClose: string) => {
        const parts = attributes.match(/[\w-]+(?:="[^"]*"|'[^']*')?/g) ?? [];
        parts.sort();
        const rendered = parts.length > 0 ? ` ${parts.join(' ')}` : '';
        return `<${tag}${rendered}${selfClose ? ' /' : ''}>`;
      },
    )
    .replaceAll(/>\s+</g, '><')
    .replaceAll(/\s{2,}/g, ' ')
    .trim();
}

export function renderReactSsr<P extends MpPropertyBag>(
  component: MpComponent<P>,
  properties: Partial<P> = {},
  children?: ParityChildren,
): string {
  const ReactComponent = toReactComponent(component, component.name || 'MpComponent');
  return renderToStaticMarkup(createElement(ReactComponent, properties as P, children as ReactNode));
}

export async function renderVueSsr<P extends MpPropertyBag>(
  component: MpComponent<P>,
  properties: Partial<P> = {},
  children?: ParityChildren,
): Promise<string> {
  const VueComponent = toVueComponent(component, component.name || 'MpComponent');
  const slots = children === undefined ? undefined : { default: () => children as unknown as MpChild };
  return renderToString(
    createSSRApp({
      render: () => vueH(VueComponent, properties as P, slots),
    }),
  );
}

export async function expectSsrParity<P extends MpPropertyBag>(
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
