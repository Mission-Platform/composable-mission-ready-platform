import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeForm } from './forge-form';

const ReactForm = toReactComponent(ForgeForm, 'Form');
const VueForm = toVueComponent(ForgeForm, 'Form');

describe('ForgeForm authors the same component for React and Vue', () => {
  it('renders a form container with children on both frameworks', async () => {
    const properties = { id: 'test-form', className: 'custom-form' };
    const react = renderToStaticMarkup(
      createElement(ReactForm, properties, createElement('button', { type: 'submit' }, 'Submit')),
    );
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueForm, properties, () => [vueH('button', { type: 'submit' }, 'Submit')]) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('form');
      expect(html).toContain('id="test-form"');
      expect(html).toContain('custom-form');
      expect(html).toContain('Submit');
    }
  });

  it('submits form with valid data and calls onSubmit', async () => {
    const onSubmit = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        vueH(
          VueForm,
          {
            initialValues: { username: 'testuser' },
            onSubmit,
          },
          () => [vueH('button', { id: 'submit-btn', type: 'submit' }, 'Save')],
        ),
    });
    app.mount(host);

    const form = host.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await nextTick();

    expect(onSubmit).toHaveBeenCalled();
    expect(onSubmit.mock.calls[0][0]).toEqual({ username: 'testuser' });

    app.unmount();
    host.remove();
  });

  it('renders accessible error summary banner when errors are present on both frameworks', async () => {
    const properties = {
      errors: { username: 'Username is required' },
      errorSummaryTitle: 'Form Errors',
    };
    const react = renderToStaticMarkup(createElement(ReactForm, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueForm, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="alert"');
      expect(html).toContain('Form Errors');
      expect(html).toContain('Username is required');
      expect(html).toContain('href="#username"');
    }
  });
});
