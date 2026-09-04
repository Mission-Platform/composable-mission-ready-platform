import { html, type TemplateResult } from '@mission-platform/forge-adapters/web-components';

import { renderEmailFragment, type EmailNode } from '../render';

/** Create a native Forge template result for a Web Components host. */
export function renderToEmailWebComponent(node: EmailNode): TemplateResult {
  const markup = renderEmailFragment(node);
  const strings = [markup] as unknown as TemplateStringsArray;
  return html(strings);
}
