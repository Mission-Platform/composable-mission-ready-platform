// @vitest-environment jsdom
import mermaid from 'mermaid';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { toReactComponent } from '../../../../../forge/src/adapters/react';

import { ForgeMermaid } from './forge-mermaid';
import { mermaidThemeCSS, mermaidThemeVariables } from './forge-mermaid-theme';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mermaidRender = vi.hoisted(() => vi.fn());
vi.mock('@mission-platform/forge-jsx', async (importOriginal) => {
  const actual = await importOriginal();
  const react = await import('react');
  const neutral = await import('../../../../../forge/src/runtime');
  return {
    ...actual,
    Dynamic: neutral.Dynamic,
    Fragment: neutral.Fragment,
    HtmlContent: neutral.HtmlContent,
    h: neutral.h,
    useEffect: react.useEffect,
    useId: react.useId,
    useRef: react.useRef,
    useState: react.useState,
  };
});

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: mermaidRender,
  },
}));

const ReactMermaid = toReactComponent(ForgeMermaid, 'Mermaid');
const mermaidInitialize = vi.mocked(mermaid.initialize);
let root: Root | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
  mermaidRender.mockReset();
  mermaidInitialize.mockReset();
});

describe('ForgeMermaid', () => {
  it('keeps its source fallback during SSR', () => {
    const markup = renderToStaticMarkup(createElement(ReactMermaid, { code: '<svg>source</svg>' }));

    expect(markup).toContain('<pre');
    expect(markup).toContain('&lt;svg&gt;source&lt;/svg&gt;');
    expect(markup).not.toContain('<svg>source</svg>');
  });

  it('binds Mermaid functions after HtmlContent commits the SVG host', async () => {
    const bindFunctions = vi.fn();
    mermaidRender.mockResolvedValue({ svg: '<svg><title>diagram</title></svg>', bindFunctions });
    const container = document.createElement('div');
    root = createRoot(container);

    await act(async () => {
      root?.render(createElement(ReactMermaid, { code: 'flowchart LR\nA --> B' }));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(mermaidRender).toHaveBeenCalledTimes(1);
    expect(mermaidInitialize).toHaveBeenCalledWith({
      securityLevel: 'strict',
      startOnLoad: false,
      theme: 'base',
      themeCSS: mermaidThemeCSS,
    });
    const host = container.querySelector('[role="img"]');
    expect(host?.querySelector('svg title')?.textContent).toBe('diagram');
    expect(mermaidRender.mock.calls[0]?.[0]).not.toBe(host?.id);
    expect(bindFunctions).toHaveBeenCalledTimes(1);
    expect(bindFunctions).toHaveBeenCalledWith(host);
  });

  it('ignores a Mermaid result that resolves after unmount', async () => {
    let resolveRender: ((result: { svg: string; bindFunctions: () => void }) => void) | undefined;
    const bindFunctions = vi.fn();
    mermaidRender.mockReturnValue(
      new Promise<{ svg: string; bindFunctions: () => void }>((resolve) => {
        resolveRender = resolve;
      }),
    );
    const container = document.createElement('div');
    root = createRoot(container);

    await act(async () => {
      root?.render(createElement(ReactMermaid, { code: 'flowchart LR\nA --> B' }));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
    root.unmount();
    root = undefined;

    await act(async () => {
      resolveRender?.({ svg: '<svg>stale</svg>', bindFunctions });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(bindFunctions).not.toHaveBeenCalled();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('keeps the semantic palette immutable and token-backed', () => {
    expect(Object.isFrozen(mermaidThemeVariables)).toBe(true);
    expect(mermaidThemeVariables).toMatchObject({
      background: 'var(--mp-color-bg-sunken)',
      primaryColor: 'var(--mp-color-primary-subtle)',
      primaryTextColor: 'var(--mp-color-primary-text)',
      primaryBorderColor: 'var(--mp-color-primary-default)',
      lineColor: 'var(--mp-color-text-secondary)',
      cScale0: 'var(--mp-color-primary-subtle)',
      cScale1: 'var(--mp-color-success-subtle)',
      cScale2: 'var(--mp-color-warning-subtle)',
      cScale3: 'var(--mp-color-danger-subtle)',
      cScale4: 'var(--mp-color-info-subtle)',
    });
    expect(Object.values(mermaidThemeVariables).every((value) => value.startsWith('var(--mp-'))).toBe(true);
    expect(mermaidThemeCSS).toContain('.node rect');
    expect(mermaidThemeCSS).toContain('var(--mp-color-success-subtle)');
    expect(mermaidThemeCSS).toContain('var(--mp-color-warning-subtle)');
    expect(mermaidThemeCSS).toContain('var(--mp-color-danger-subtle)');
    expect(mermaidThemeCSS).toContain('var(--mp-color-info-subtle)');
  });
});
