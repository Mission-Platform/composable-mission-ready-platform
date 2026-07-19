'use client';

import { MpI18nProvider } from '@mission-platform/i18n/react';
import { type ReactNode, useMemo } from 'react';

import { createAppI18n } from '@/app/i18n';

/**
 * Client-side context providers shared by every interactive page. Builds the
 * app's i18next instance once (per client) and exposes it through
 * `@mission-platform/i18n`'s React provider so descendants can call `useI18n()`.
 */
export function AppProviders({ children }: { readonly children: ReactNode }) {
  const i18n = useMemo(() => createAppI18n(), []);
  return <MpI18nProvider i18n={i18n}>{children}</MpI18nProvider>;
}
