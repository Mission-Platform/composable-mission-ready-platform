import { createRawSnippet, type Snippet } from 'svelte';

import { renderEmailFragment, type EmailNode } from '../render';

/** Convert a shared Forge tree into a Svelte 5 raw snippet for `{@render ...}`. */
export function renderToEmailSvelte(node: EmailNode): Snippet {
  const markup = renderEmailFragment(node);
  return createRawSnippet(() => ({ render: () => markup }));
}
