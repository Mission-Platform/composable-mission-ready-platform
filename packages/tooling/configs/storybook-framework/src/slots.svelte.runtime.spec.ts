/**
 * @vitest-environment jsdom
 *
 * Runtime regression for the Svelte slot bridge. Unlike `slots.spec.ts` — which
 * mocks `createRawSnippet` as a bare `vi.fn()` and only asserts callability —
 * this suite executes the *real* raw-snippet `render`/`setup` contract and the
 * mounter cleanup paths. It reproduces the `TypeError: e is not a function`
 * cluster: a multi-child slot such as a dialog/card `footer={[<A/>, <B/>]}` was
 * passed through as a raw array, so the generated Svelte component invoked it as
 * a snippet and threw. The adapter must now wrap arrays-containing-mounters in a
 * snippet while leaving ordinary props (a plain `size="md"` string) untouched.
 */
import { describe, expect, it, vi } from 'vitest';

import type { StoryNodeFactory, RenderWithSlots } from './slots.types.js';

/** A raw snippet exposed for the test harness so `render`/`setup` can be driven. */
interface ProbeSnippet {
  __rawSnippet: true;
  factory: () => { render: () => string; setup?: (element: Element) => (() => void) | void };
}

interface CapturedMount {
  component: unknown;
  props: Record<string, unknown>;
  target: Element;
}

const svelteMock = vi.hoisted(() => ({ lastMount: undefined as CapturedMount | undefined }));

vi.mock('svelte', () => ({
  // Execute nothing eagerly: keep the factory so the test can run render/setup
  // exactly the way Svelte drives a raw snippet at its anchor.
  createRawSnippet: (factory: ProbeSnippet['factory']): ProbeSnippet => ({
    __rawSnippet: true,
    factory,
  }),
  // Capture what the adapter forwards and mirror Svelte mounting the component.
  mount: (component: unknown, options: { target: Element; props: Record<string, unknown> }) => {
    svelteMock.lastMount = { component, props: options.props, target: options.target };
    return { component, options };
  },
  unmount: vi.fn(),
}));

function isProbeSnippet(value: unknown): value is ProbeSnippet {
  return typeof value === 'object' && value !== null && (value as Partial<ProbeSnippet>).__rawSnippet === true;
}

/** Drive a raw snippet the way Svelte does: render markup, then mount into a host. */
function driveSnippet(value: unknown): { html: string; host: HTMLElement; teardown: () => void } {
  expect(isProbeSnippet(value)).toBe(true);
  const { render, setup } = (value as ProbeSnippet).factory();
  const host = document.createElement('div');
  const html = render();
  const teardown = setup?.(host) ?? ((): void => {});
  return { html, host, teardown: teardown as () => void };
}

/** A stand-in compiled Svelte component; only its identity/props matter here. */
const probe = (): void => {};

let svelteSlots: { node: StoryNodeFactory; renderWithSlots: RenderWithSlots };

async function loadSlots(): Promise<void> {
  svelteSlots ??= await import('./slots.svelte.js');
  svelteMock.lastMount = undefined;
}

describe('svelte slot bridge runtime', () => {
  it('wraps a multi-child (array-of-mounters) slot prop in a snippet that mounts every child', async () => {
    await loadSlots();
    const footer = [
      svelteSlots.node('button', { type: 'button' }, 'Cancel'),
      svelteSlots.node('button', { type: 'button' }, 'Confirm'),
    ];

    // ForgeDialog forwards `footer` through props (h(Dialog, { footer })), not
    // renderWithSlots, so it lands in the toSvelteProperties property loop.
    const mounter = svelteSlots.node(probe, { footer, size: 'md' }) as (target: Element) => () => void;
    mounter(document.createElement('div'));

    const properties = svelteMock.lastMount?.props ?? {};
    // The array-of-mounters slot became a snippet; the plain string is untouched.
    expect(isProbeSnippet(properties.footer)).toBe(true);
    expect(properties.size).toBe('md');

    const { html, host, teardown } = driveSnippet(properties.footer);
    expect(html).toContain('mp-slot');
    const buttons = host.querySelectorAll('button');
    expect([...buttons].map((button) => button.textContent)).toEqual(['Cancel', 'Confirm']);

    teardown();
    expect(host.querySelector('button')).toBeNull();
  });

  it('leaves a primitive slot value as a plain prop for the compiler to render as text', async () => {
    await loadSlots();
    const mounter = svelteSlots.node(probe, { header: 'Title', count: 3 }) as (target: Element) => () => void;
    mounter(document.createElement('div'));

    const properties = svelteMock.lastMount?.props ?? {};
    // A same-typed prop must not be wrapped: the compiler's slot-value helper
    // normalizes a non-function value to a text snippet at the render site.
    expect(properties.header).toBe('Title');
    expect(properties.count).toBe(3);
  });

  it('mounts and tears down a nested mounter passed as slot content', async () => {
    await loadSlots();
    const nested = svelteSlots.node('div', { class: 'card' }, svelteSlots.node('span', {}, 'Nested'));

    const mounter = svelteSlots.node(probe, { media: nested }) as (target: Element) => () => void;
    mounter(document.createElement('div'));

    const { html, host, teardown } = driveSnippet((svelteMock.lastMount?.props ?? {}).media);
    expect(html).toContain('mp-slot');
    expect(host.querySelector('div.card > span')?.textContent).toBe('Nested');

    teardown();
    expect(host.querySelector('div.card')).toBeNull();
  });

  it('executes render/setup and cleanup for both default and named slots via renderWithSlots', async () => {
    await loadSlots();
    const result = svelteSlots.renderWithSlots(
      probe,
      { open: true },
      { trigger: svelteSlots.node('button', { type: 'button' }, 'Open') },
      'BODY',
    ) as { Component: unknown; props: Record<string, unknown> };

    expect(result.Component).toBe(probe);
    expect(result.props.open).toBe(true);

    const named = driveSnippet(result.props.trigger);
    expect(named.host.querySelector('button')?.textContent).toBe('Open');
    named.teardown();
    expect(named.host.querySelector('button')).toBeNull();

    const defaultSlot = driveSnippet(result.props.children);
    expect(defaultSlot.host.textContent).toBe('BODY');
    defaultSlot.teardown();
    expect(defaultSlot.host.textContent).toBe('');
  });
});
