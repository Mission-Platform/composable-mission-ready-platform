'use client';

import { ForgeButton } from '@mission-platform/components';
import { type FormValues } from '@mission-platform/forms';
import { useI18n } from '@mission-platform/i18n';
import { ForgeTypography } from '@mission-platform/typography';
import { ForgeIconPlus } from '@mission-platform/icons';
import { useState } from 'react';

import { type MonitorTarget, type ProbeType } from '@/monitoring/types';
import { sanitizeMonitor } from '@/monitoring/validation';

import { EMPTY_FORM, MonitorForm, TYPE_LABELS, URL_TYPES } from './monitor-form';
import { MonitorListItem } from './monitor-list-item';

interface MonitorManagerProperties {
  readonly monitors: MonitorTarget[];
  readonly defaultIntervalSeconds: number;
  readonly onSave: (monitor: MonitorTarget) => Promise<boolean>;
  readonly onDelete: (id: string) => Promise<boolean>;
}

function stringValue(values: FormValues, key: string): string {
  return typeof values[key] === 'string' ? values[key].trim() : '';
}

/**
 * Runtime monitor configuration UI. Lists the current monitors (each with its
 * own type and interval) and lets an operator add, edit, or remove them — all
 * of which is persisted server-side through the JSON API.
 */
export function MonitorManager({ monitors, defaultIntervalSeconds, onSave, onDelete }: MonitorManagerProperties) {
  const { t } = useI18n();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const edit = (monitor: MonitorTarget): void => {
    setEditingId(monitor.id);
    setError(null);
    setForm({
      id: monitor.id,
      name: monitor.name,
      type: monitor.type ?? 'http',
      intervalSeconds: monitor.intervalSeconds ?? '',
      url: monitor.url ?? '',
      host: monitor.host ?? '',
      port: monitor.port ?? '',
      query: monitor.query ?? '',
      jsonPath: monitor.jsonPath ?? '',
      expect: monitor.expect ?? '',
      recordType: monitor.recordType ?? 'A',
      autoIncident: monitor.autoIncident ?? false,
      failThreshold: monitor.failThreshold ?? 3,
      successThreshold: monitor.successThreshold ?? 2,
    });
    setFormOpen(true);
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setError(null);
    setForm(EMPTY_FORM);
    setFormOpen(false);
  };

  const submit = async (values: FormValues, isValid: boolean) => {
    setError(null);

    const type = stringValue(values, 'type') as ProbeType;
    const usesUrl = URL_TYPES.has(type);
    if (!isValid) return;

    // Assemble the raw form values, then validate and normalise them through
    // the same routine the server uses so the client and server accept exactly
    // the same monitors.
    const draft: Record<string, unknown> = {
      id: stringValue(values, 'id'),
      name: stringValue(values, 'name'),
      type,
      autoIncident: values['autoIncident'] === true,
    };
    if (values['intervalSeconds'] !== '' && values['intervalSeconds'] !== undefined) {
      draft.intervalSeconds = Number(values['intervalSeconds']);
    }
    if (usesUrl) {
      draft.url = stringValue(values, 'url');
    } else {
      draft.host = stringValue(values, 'host');
    }
    if (type === 'graphql' && stringValue(values, 'query')) {
      draft.query = stringValue(values, 'query');
    }
    if (type === 'json') {
      if (stringValue(values, 'jsonPath')) draft.jsonPath = stringValue(values, 'jsonPath');
      if (stringValue(values, 'expect')) draft.expect = stringValue(values, 'expect');
    }
    if (type === 'dns' && stringValue(values, 'recordType')) {
      draft.recordType = stringValue(values, 'recordType');
    }
    if (!usesUrl && values['port'] !== '' && values['port'] !== undefined) {
      draft.port = Number(values['port']);
    }
    if (draft.autoIncident) {
      draft.failThreshold = Number(values['failThreshold']) || 3;
      draft.successThreshold = Number(values['successThreshold']) || 2;
    }

    const monitor = sanitizeMonitor(draft);
    if (!monitor) {
      setError(
        t(($) => $.monitors.error.required, {
          ns: 'mp.service-monitor',
          defaultValue: 'Provide an id, a name, and a URL (HTTP/JSON/GraphQL) or host.',
        }),
      );
      return;
    }

    setBusy(true);
    const ok = await onSave(monitor);
    setBusy(false);
    if (ok) {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setFormOpen(false);
    } else {
      setError(
        t(($) => $.monitors.error.rejected, {
          ns: 'mp.service-monitor',
          defaultValue: 'The server rejected this monitor. Check the fields and try again.',
        }),
      );
    }
  };

  return (
    <section
      className="monitors"
      aria-label={t(($) => $.monitors.configuration, {
        ns: 'mp.service-monitor',
        defaultValue: 'Monitor configuration',
      })}
    >
      <div className="monitors__head">
        <ForgeTypography
          as="h2"
          variant="h3"
          className="monitors__title"
        >
          {t(($) => $.monitors.title, { ns: 'mp.service-monitor', defaultValue: 'Monitors' })}
        </ForgeTypography>
        <ForgeTypography
          as="p"
          variant="body-sm"
          className="monitors__subtitle"
        >
          {t(($) => $.monitors.subtitle, {
            ns: 'mp.service-monitor',
            defaultValue: 'Configured at runtime · default interval {interval}s.',
            interval: defaultIntervalSeconds,
          })}
        </ForgeTypography>
        <ForgeButton
          onClick={() => {
            cancelEdit();
            setFormOpen(true);
          }}
        >
          <ForgeIconPlus aria-hidden="true" />{' '}
          {t(($) => $.monitors.add, { ns: 'mp.service-monitor', defaultValue: 'Add monitor' })}
        </ForgeButton>
      </div>

      <ul className="monitors__list">
        {monitors.map((monitor) => (
          <MonitorListItem
            key={monitor.id}
            monitor={monitor}
            typeLabel={TYPE_LABELS[monitor.type ?? 'http']}
            defaultIntervalSeconds={defaultIntervalSeconds}
            onEdit={() => edit(monitor)}
            onDelete={() => void onDelete(monitor.id)}
          />
        ))}
      </ul>

      <MonitorForm
        open={formOpen}
        editingId={editingId}
        defaultIntervalSeconds={defaultIntervalSeconds}
        form={form}
        busy={busy}
        error={error}
        onUpdateForm={setForm}
        onSubmit={(values, isValid) => void submit(values, isValid)}
        onCancel={cancelEdit}
      />
    </section>
  );
}
