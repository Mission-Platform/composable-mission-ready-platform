import { createMpI18n, mpNamespace } from '@mission-platform/i18n';
import { resources } from 'virtual:i18n-resources';

import type { MpI18n } from '@mission-platform/i18n';

/** The app's own i18n namespace (`mp.service-monitor`). */
export const APP_NAMESPACE = mpNamespace('service-monitor');

/**
 * The app's i18next instance. Created once per environment (server render and
 * client hydration each build their own) and provided to the interactive tree
 * through `MpI18nProvider` in {@link AppProviders}.
 */
export function createAppI18n(): MpI18n {
  return createMpI18n({ namespace: APP_NAMESPACE, resources });
}
