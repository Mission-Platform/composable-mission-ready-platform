import { h } from '@mission-platform/forge-jsx';
import { describe, expect, it } from 'vitest';

import { renderEmail } from '../render';

import {
  renderToEmailReact,
  renderToEmailSolid,
  renderToEmailSvelte,
  renderToEmailVue,
  renderToEmailWebComponent,
} from '.';

describe('email browser adapters', () => {
  it('accept the same Forge tree as the dedicated email serializer', () => {
    const node = h(
      'table',
      { role: 'presentation' },
      h('tbody', {}, h('tr', {}, h('td', {}, 'A shared email composition'))),
    );
    const emailHtml = renderEmail(node, { title: 'Shared composition' });

    expect(emailHtml).toContain('<!doctype html>');
    expect(renderToEmailVue(node)).toBeDefined();
    expect(renderToEmailReact(node)).toBeDefined();
    expect(renderToEmailSolid(node)).toBeDefined();
    expect(renderToEmailSvelte(node)).toBeDefined();
    expect(renderToEmailWebComponent(node)).toBeDefined();
  });
});
