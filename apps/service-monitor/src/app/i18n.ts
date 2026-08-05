import { createForgeI18N, forgeNamespace } from '@mission-platform/i18n';
import { resources } from 'virtual:i18n-resources';

import type { ForgeI18N } from '@mission-platform/i18n';

/** The app's own i18n namespace (`mp.service-monitor`). */
export const APP_NAMESPACE = forgeNamespace('service-monitor');

/**
 * The app's i18next instance. Created once per environment (server render and
 * client hydration each build their own) and provided to the interactive tree
 * through `ForgeI18NProvider` in {@link AppProviders}.
 */
export function createAppI18n(): ForgeI18N {
  return createForgeI18N({ namespace: APP_NAMESPACE, resources });
}
