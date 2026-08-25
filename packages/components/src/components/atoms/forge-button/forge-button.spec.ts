import { readFileSync } from 'node:fs';
import path from 'node:path';

import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeButton } from './forge-button';

/**
 * Exercises the **neutral** `ForgeButton` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge` runtime adapters. That
 * keeps the assertions independent of the build-time plugin (whose React/Vue
 * parity is covered in `@mission-platform/vite-plugin-forge`), while proving the
 * component itself — mirroring the `@mission-platform/components` `ForgeButton`
 * (nine variants, the `2xs → 2xl` size scale, and a loading spinner) — is
 * correct and framework-portable.
 */
const ReactButton = toReactComponent(ForgeButton, 'Button');
const VueButton = toVueComponent(ForgeButton, 'Button');
const buttonStyles = readFileSync(
  path.resolve(process.cwd(), 'src/components/atoms/forge-button/forge-button.module.scss'),
  'utf8',
);
type TokenLeaf = { $value: string };
type ButtonContract = Record<
  string,
  {
    background: Record<string, TokenLeaf>;
    text: Record<string, TokenLeaf>;
    border: Record<string, TokenLeaf>;
  }
>;
const componentContract = JSON.parse(
  readFileSync(path.resolve(process.cwd(), '../tokens/tokens/component/atoms/button.tokens.json'), 'utf8'),
) as { component: { button: ButtonContract } };

describe('ForgeButton authors the same component for React and Vue', () => {
  it('renders the variant and size modifiers to matching markup on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactButton, { variant: 'secondary', size: 'lg', disabled: true }, 'Save'),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueButton, { variant: 'secondary', size: 'lg', disabled: true }, () => 'Save'),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<button');
      expect(html).toContain('forge-button--secondary');
      expect(html).toContain('forge-button--lg');
      expect(html).toContain('Save');
    }
  });

  it('renders the accessible loading spinner on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactButton, { loading: true }, 'Save'));
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueButton, { loading: true }, () => 'Save'),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('forge-button--loading');
      expect(html).toContain('forge-button__spinner');
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="Loading…"');
    }
  });

  it('keeps migrated variant tokens aligned with the original visual treatments', () => {
    const { button } = componentContract.component;
    expect(button.neutral.text.default.$value).toBe('{color.text.on-primary}');
    expect(button.secondary.background.default.$value).toBe('{color.bg.surface}');
    expect(button.secondary.border.hover.$value).toBe('{color.border.strong}');
    expect(button.tertiary.background.default.$value).toBe('transparent');
    expect(button.ghost.background.default.$value).toBe('transparent');
    expect(buttonStyles).toContain("@include transparent('tertiary');");
    expect(buttonStyles).toContain("@include transparent('ghost');");
    expect(buttonStyles).toContain('--mp-button-secondary-border-hover');
  });

  it('exposes the loading spinner motion as component token hooks', () => {
    const spinner = (componentContract.component.button as Record<string, unknown>).spinner as Record<string, unknown>;
    expect(spinner).toHaveProperty('animation-duration');
    expect(spinner).toHaveProperty('animation-easing');
    expect(buttonStyles).toContain('--mp-button-spinner-animation-duration');
    expect(buttonStyles).toContain('--mp-button-spinner-animation-easing');
  });

  it('emits defined typed custom-property overrides through neutral style', () => {
    const element = ForgeButton({
      label: 'Save',
      properties: {
        'primary-radius': '12px',
        'primary-gap': '0.5rem',
      },
    });

    expect(element.properties).toMatchObject({
      style: {
        '--forge-button-primary-radius': '12px',
        '--forge-button-primary-gap': '0.5rem',
      },
    });
    expect(element.properties).not.toHaveProperty('styles');
    expect(element.properties.style).not.toHaveProperty('--forge-button-font-family');
  });
});
