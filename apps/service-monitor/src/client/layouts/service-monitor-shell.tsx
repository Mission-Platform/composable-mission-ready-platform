'use client';

import { ForgeLanguageSwitcher, ForgeNavbar, ForgeNavbarItem, ForgeThemeToggle } from '@mission-platform/components';
import { useI18n } from '@mission-platform/i18n';
import { ForgeApplicationLayout } from '@mission-platform/layouts';

import type { Incident } from '@/monitoring/types';
import type { Resource } from 'i18next';
import type { ReactNode } from 'react';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'it', label: 'Italiano' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'he', label: 'עברית' },
];

const localeBundles: Record<string, () => Promise<{ resources: Resource }>> = {
  ar: () => import('virtual:i18n-locale-ar'),
  de: () => import('virtual:i18n-locale-de'),
  es: () => import('virtual:i18n-locale-es'),
  fr: () => import('virtual:i18n-locale-fr'),
  he: () => import('virtual:i18n-locale-he'),
  it: () => import('virtual:i18n-locale-it'),
  ja: () => import('virtual:i18n-locale-ja'),
  ko: () => import('virtual:i18n-locale-ko'),
  nl: () => import('virtual:i18n-locale-nl'),
  zh: () => import('virtual:i18n-locale-zh'),
};

interface ServiceMonitorShellProperties {
  readonly incidents: Incident[];
  readonly children: ReactNode;
}

export function ServiceMonitorShell({ incidents, children }: ServiceMonitorShellProperties) {
  const { t, i18n, locale, setLocale } = useI18n();
  const activeIncidents = incidents.filter((incident) => incident.status !== 'resolved');
  const hasCriticalIncident = activeIncidents.some((incident) => incident.severity === 'critical');

  const handleLocaleChange = async (nextLocale: string) => {
    if (nextLocale !== 'en' && !i18n.hasResourceBundle(nextLocale, 'mp.service-monitor')) {
      const loadBundle = localeBundles[nextLocale];
      if (loadBundle) {
        const { resources } = await loadBundle();
        for (const [namespace, messages] of Object.entries(resources[nextLocale] ?? {})) {
          i18n.addResourceBundle(nextLocale, namespace, messages, true, true);
        }
      }
    }
    await setLocale(nextLocale);
    if (typeof document !== 'undefined') {
      const dir = nextLocale === 'ar' || nextLocale === 'he' ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', nextLocale);
    }
  };

  return (
    <ForgeApplicationLayout
      stickyHeader
      statusLevel={activeIncidents.length === 0 ? 'none' : hasCriticalIncident ? 'error' : 'warning'}
      status={
        activeIncidents.length > 0 ? (
          <div className="app-shell__status">
            <strong>
              {t(($) => $.shell.activeIncidents, {
                ns: 'mp.service-monitor',
                count: activeIncidents.length,
                defaultValue: '{count} active incident',
                defaultValue_other: '{count} active incidents',
              })}
            </strong>
            <span>{activeIncidents.map((incident) => incident.title).join(' · ')}</span>
            <a href="/incidents">
              {t(($) => $.shell.viewIncidentDetails, {
                ns: 'mp.service-monitor',
                defaultValue: 'View incident details',
              })}
            </a>
          </div>
        ) : undefined
      }
      navbar={
        <ForgeNavbar
          brand={
            <a
              className="app-shell__brand"
              href="/"
            >
              {t(($) => $.shell.title, { ns: 'mp.service-monitor', defaultValue: 'Service Monitor' })}
            </a>
          }
          end={
            <div className="app-shell__controls">
              <ForgeLanguageSwitcher
                locale={locale}
                locales={LOCALES}
                onLocaleChange={handleLocaleChange}
              />
              <ForgeThemeToggle />
            </div>
          }
        >
          <ForgeNavbarItem
            href="/"
            label={t(($) => $.nav.status, { ns: 'mp.service-monitor', defaultValue: 'Status' })}
          />
          <ForgeNavbarItem
            href="/dashboard"
            label={t(($) => $.nav.dashboard, { ns: 'mp.service-monitor', defaultValue: 'Dashboard' })}
          />
          <ForgeNavbarItem
            href="/monitors"
            label={t(($) => $.nav.monitors, { ns: 'mp.service-monitor', defaultValue: 'Monitors' })}
          />
          <ForgeNavbarItem
            href="/incidents"
            label={t(($) => $.nav.incidents, {
              ns: 'mp.service-monitor',
              defaultValue: 'Incidents & maintenance',
            })}
          />
        </ForgeNavbar>
      }
      content={children}
      footer={
        <div className="app-shell__footer">
          <span>{t(($) => $.shell.title, { ns: 'mp.service-monitor', defaultValue: 'Service Monitor' })}</span>
          <a href="/">
            {t(($) => $.shell.currentStatus, { ns: 'mp.service-monitor', defaultValue: 'Current system status' })}
          </a>
        </div>
      }
    />
  );
}
