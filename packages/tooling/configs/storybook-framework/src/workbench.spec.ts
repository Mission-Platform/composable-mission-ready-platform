/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';

import * as reactSlots from './slots.react.js';
import * as solidSlots from './slots.solid.js';
import * as svelteSlots from './slots.svelte.js';
import * as vueSlots from './slots.vue.js';
import * as webComponentSlots from './slots.web-component.js';

import { createStorybookConfig, resolveStorybookFramework, storyGlobs } from './index';

describe('Storybook Workbench Multi-Framework Parity', () => {
  const PACKAGES = [
    'components',
    'float',
    'select',
    'theme',
    'typography',
    'icons',
    'layouts',
    'content',
    'forms',
    'vcard',
  ];

  it('generates consistent neutral story discovery globs across all target frameworks', () => {
    const frameworks = ['vue', 'react', 'solid', 'svelte', 'web-component'] as const;
    const globsMap = new Map(
      frameworks.map((framework) => [framework, storyGlobs(framework, PACKAGES, '../../packages')]),
    );

    const baseGlobs = globsMap.get('vue')!;
    expect(baseGlobs.length).toBeGreaterThan(0);

    for (const framework of frameworks) {
      expect(globsMap.get(framework)).toEqual(baseGlobs);
    }
  });

  it('correctly maps target frameworks to their respective Storybook core presets', () => {
    expect(resolveStorybookFramework('vue')).toBe('vue');
    expect(resolveStorybookFramework('react')).toBe('react');
    expect(resolveStorybookFramework('solid')).toBe('solid');
    expect(resolveStorybookFramework('svelte')).toBe('svelte');
    expect(resolveStorybookFramework('web-component')).toBe('web-component');

    const configVue = createStorybookConfig({ framework: 'vue', packages: PACKAGES });
    expect(configVue.framework).toBe('@storybook/vue3-vite');

    const configReact = createStorybookConfig({ framework: 'react', packages: PACKAGES });
    expect(configReact.framework).toBe('@storybook/react-vite');

    const configSolid = createStorybookConfig({ framework: 'solid', packages: PACKAGES });
    expect(configSolid.framework).toBe('@storybook/html-vite');

    const configSvelte = createStorybookConfig({ framework: 'svelte', packages: PACKAGES });
    expect(configSvelte.framework).toBe('@storybook/svelte-vite');

    const configWebComponents = createStorybookConfig({ framework: 'web-component', packages: PACKAGES });
    expect(configWebComponents.framework).toBe('@storybook/web-components-vite');
  });

  it('renders neutral button primitive consistently across all 5 framework slot bridges', () => {
    const props = { variant: 'primary', size: 'md', disabled: false };
    const label = 'Click Me';
    const buttonComponent = () => null;

    // 1. Vue slot render
    const vueNode = vueSlots.renderWithSlots(buttonComponent, props, {}, label) as {
      props: Record<string, unknown>;
      children: Record<string, () => unknown>;
    };
    expect(vueNode.props.variant).toBe('primary');
    expect(vueNode.props.size).toBe('md');
    expect(typeof vueNode.children.default).toBe('function');
    expect(vueNode.children.default()).toBe(label);

    // 2. React slot render
    const reactNode = reactSlots.renderWithSlots(buttonComponent, props, {}, label) as {
      props: Record<string, unknown>;
    };
    expect(reactNode.props.variant).toBe('primary');
    expect(reactNode.props.children).toBe(label);

    // 3. Solid slot render
    let solidCaptured: Record<string, unknown> | undefined;
    solidSlots.renderWithSlots(
      (capturedProps: Record<string, unknown>) => {
        solidCaptured = capturedProps;
      },
      props,
      {},
      label,
    );
    expect(solidCaptured).toMatchObject({ variant: 'primary', size: 'md', children: label });

    // 4. Svelte slot render
    const svelteResult = svelteSlots.renderWithSlots(buttonComponent, props, {}, label) as {
      Component: unknown;
      props: Record<string, unknown>;
    };
    expect(svelteResult.Component).toBe(buttonComponent);
    expect(svelteResult.props.variant).toBe('primary');
    expect(typeof svelteResult.props.children).toBe('function');

    // 5. Web Component slot render
    class ForgeButtonMockElement extends HTMLElement {}
    if (!customElements.get('forge-button-mock')) {
      customElements.define('forge-button-mock', ForgeButtonMockElement);
    }
    const wcElement = webComponentSlots.renderWithSlots(ForgeButtonMockElement, props, {}, label) as HTMLElement;
    expect(wcElement.tagName.toLowerCase()).toBe('forge-button-mock');
    expect((wcElement as unknown as { variant: string }).variant).toBe('primary');
  });

  it('renders complex compound components with named slots across all framework bridges', () => {
    const cardProps = { elevated: true };
    const headerContent = 'Card Header';
    const bodyContent = 'Card Body';
    const cardComponent = () => null;

    // Vue
    const vueCard = vueSlots.renderWithSlots(cardComponent, cardProps, { header: headerContent }, bodyContent) as {
      children: Record<string, () => unknown>;
    };
    expect(vueCard.children.header()).toBe(headerContent);
    expect(vueCard.children.default()).toBe(bodyContent);

    // React
    const reactCard = reactSlots.renderWithSlots(cardComponent, cardProps, { header: headerContent }, bodyContent) as {
      props: Record<string, unknown>;
    };
    expect(reactCard.props.header).toBe(headerContent);
    expect(reactCard.props.children).toBe(bodyContent);

    // Svelte
    const svelteCard = svelteSlots.renderWithSlots(
      cardComponent,
      cardProps,
      { header: headerContent },
      bodyContent,
    ) as {
      props: Record<string, unknown>;
    };
    expect(typeof svelteCard.props.header).toBe('function');
    expect(typeof svelteCard.props.children).toBe('function');
  });
});
