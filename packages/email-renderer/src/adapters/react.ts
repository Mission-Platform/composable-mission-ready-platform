import { renderToReact, toReactComponent } from '@mission-platform/forge/react';

import type { EmailNode } from '../render';
import type { MpComponent, MpPropertyBag } from '@mission-platform/forge';
import type { FunctionComponent, ReactElement } from 'react';

/** Render the shared Forge tree as a React element for browser previews. */
export function renderToEmailReact(node: EmailNode): ReactElement {
  return renderToReact(node);
}

/** Wrap a Forge email component as a React function component. */
export function toEmailReactComponent<P extends MpPropertyBag>(
  component: MpComponent<P>,
  name?: string,
): FunctionComponent<P> {
  return toReactComponent(component, name);
}
