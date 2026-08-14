import { toVueComponent } from '@mission-platform/forge/vue';
import { IconSpriteProvider } from '@mission-platform/icons';
import { h, type VNode } from 'vue';
import { RouterView } from 'vue-router';

const VueIconSpriteProvider = toVueComponent(IconSpriteProvider);

/** Render the website route tree beneath the application-level providers. */
export const renderRoot = (): VNode => h(VueIconSpriteProvider, undefined, { default: () => h(RouterView) });
