'use client';

import { ForgeI18NProvider } from '@mission-platform/i18n';
import { ForgeThemeProvider } from '@mission-platform/theme';
import { type ReactNode, useMemo } from 'react';

import { createAppI18n } from '@/app/i18n';

/**
 * Client-side context providers shared by every interactive page. Builds the
 * app's i18next instance once (per client) and exposes it through
 * `@mission-platform/i18n`'s React provider so descendants can call `useI18n()`.
 */
export function AppProviders({ children }: { readonly children: ReactNode }) {
  const i18n = useMemo(() => createAppI18n(), []);
  return (
    <ForgeI18NProvider i18n={i18n}>
      <ForgeThemeProvider>{children}</ForgeThemeProvider>
    </ForgeI18NProvider>
  );
}
