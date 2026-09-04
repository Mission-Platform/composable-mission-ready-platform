import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { h, type MpElement } from '@mission-platform/forge-jsx';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BehaviorSubject, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { useObservable } from './use-observable';

// A neutral component that renders the observable's latest value. Authored once
// and rendered through both framework adapters below.
interface TickerProperties {
  source: Subject<string>;
  seed: string;
}

function Ticker(properties: TickerProperties): MpElement {
  const value = useObservable(properties.source, properties.seed);
  return h('span', { class: 'ticker' }, value);
}

describe('useObservable (neutral render-once baseline)', () => {
  it('returns the provided initial value', () => {
    const source = new Subject<number>();
    expect(useObservable(source, 42)).toBe(42);
  });

  it('returns `undefined` when no initial value is given', () => {
    const source = new Subject<number>();
    expect(useObservable(source)).toBeUndefined();
  });

  it('does not subscribe during a single render (effects are deferred)', () => {
    const source = new BehaviorSubject('live');
    const subscribe = vi.spyOn(source, 'subscribe');

    // The baseline `useEffect` is a no-op, so the subscription only happens once
    // a framework runtime runs the effect — never during the neutral render.
    expect(useObservable(source, 'seed')).toBe('seed');
    expect(subscribe).not.toHaveBeenCalled();
  });
});

describe('useObservable authors the same component for React and Vue', () => {
  const ReactTicker = toReactComponent(Ticker, 'Ticker');
  const VueTicker = toVueComponent(Ticker, 'Ticker');

  it('renders the seed value on both frameworks', async () => {
    const properties = { source: new Subject<string>(), seed: 'idle' };
    const react = renderToStaticMarkup(createElement(ReactTicker, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTicker, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('class="ticker"');
      expect(html).toContain('idle');
    }
  });
});
