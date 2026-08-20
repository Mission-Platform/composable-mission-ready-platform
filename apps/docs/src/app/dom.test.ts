// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { createElement } from './dom';

describe('docs DOM factory', () => {
  it('creates Markdown and navigation components as customized built-ins', () => {
    const markdown = createElement('forge-markdown');
    const layout = createElement('forge-application-layout');
    const navbar = createElement('forge-navbar');

    expect(markdown.localName).toBe('div');
    expect(markdown.getAttribute('is')).toBe('forge-markdown');
    expect(layout.getAttribute('is')).toBe('forge-application-layout');
    expect(navbar.getAttribute('is')).toBe('forge-navbar');
  });

  it('keeps autonomous Forge elements unchanged', () => {
    const routerLink = createElement('forge-router-link');

    expect(routerLink.localName).toBe('forge-router-link');
    expect(routerLink.hasAttribute('is')).toBe(false);
  });
});
