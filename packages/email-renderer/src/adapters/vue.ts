import { renderToVue, toVueComponent } from '@mission-platform/forge/vue';

import type { EmailNode } from '../render';
import type { MpComponent, MpPropertyBag } from '@mission-platform/forge';
import type { FunctionalComponent, VNode } from 'vue';

/** Render the shared Forge tree as a Vue VNode for browser previews. */
export function renderToEmailVue(node: EmailNode): VNode {
  return renderToVue(node);
}

/** Wrap a Forge email component as a Vue functional component. */
export function toEmailVueComponent<P extends MpPropertyBag>(
  component: MpComponent<P>,
  name?: string,
): FunctionalComponent<P> {
  return toVueComponent(component, name);
}
