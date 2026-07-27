'use client';

import { Badge, Button, Dialog, Typography } from '@mission-platform/components/react';
import { SchemaForm, type FormValues, type SchemaFormDefinition } from '@mission-platform/forms/react';
import { useI18n } from '@mission-platform/i18n/react';
import { IconPencil, IconPlus, IconTrash } from '@mission-platform/icons/react';
import { useState } from 'react';

import { type MonitorTarget, PROBE_TYPES, type ProbeType } from '@/monitoring/types';

interface MonitorManagerProperties {
  readonly monitors: MonitorTarget[];
  readonly defaultIntervalSeconds: number;
  readonly onSave: (monitor: MonitorTarget) => Promise<boolean>;
  readonly onDelete: (id: string) => Promise<boolean>;
}

/** Human labels for each probe type shown in the picker. */
const TYPE_LABELS: Record<ProbeType, string> = {
  http: 'HTTP',
  json: 'JSON health',
  graphql: 'GraphQL',
  dns: 'DNS (DoH)',
  tcp: 'TCP',
  mqtt: 'MQTT',
  udp: 'UDP',
  ntp: 'NTP',
  network: 'Network (ping, latency & bandwidth)',
};

/** Probe types addressed by a URL rather than a host/port. */
const URL_TYPES: ReadonlySet<ProbeType> = new Set<ProbeType>(['http', 'json', 'graphql']);

/** DNS resource record types supported by the monitor selector. */
const DNS_RECORD_TYPES = ['A', 'AAAA', 'CAA', 'CNAME', 'MX', 'NAPTR', 'NS', 'PTR', 'SOA', 'SRV', 'TXT'] as const;

const EMPTY_FORM: FormValues = {
  id: '',
  name: '',
  type: 'http',
  intervalSeconds: '',
  url: '',
  host: '',
  port: '',
  query: '',
  jsonPath: '',
  expect: '',
  recordType: 'A',
  autoIncident: false,
  failThreshold: '3',
  successThreshold: '2',
};

function stringValue(values: FormValues, key: string): string {
  return typeof values[key] === 'string' ? values[key].trim() : '';
}

function monitorSchema(editing: boolean, defaultIntervalSeconds: number): SchemaFormDefinition {
  return {
    type: 'object',
    properties: {
      id: { type: 'string', title: 'id', minLength: 1, ui: { disabled: editing } },
      name: { type: 'string', title: 'Name', minLength: 1 },
      type: {
        type: 'string',
        title: 'Probe type',
        oneOf: PROBE_TYPES.map((type) => ({ const: type, title: TYPE_LABELS[type] })),
      },
      intervalSeconds: {
        type: 'integer',
        title: 'Interval in seconds',
        minimum: 5,
        ui: { placeholder: `${defaultIntervalSeconds}s` },
      },
      url: {
        type: 'string',
        title: 'URL',
        minLength: 1,
        ui: { placeholder: 'https://example.com/health', visibleWhen: { field: 'type', in: [...URL_TYPES] } },
      },
      host: {
        type: 'string',
        title: 'Host',
        minLength: 1,
        ui: {
          placeholder: 'host (e.g. example.com)',
          visibleWhen: { field: 'type', in: ['dns', 'tcp', 'mqtt', 'udp', 'ntp', 'network'] },
        },
      },
      port: {
        type: 'integer',
        title: 'Port',
        ui: { visibleWhen: { field: 'type', in: ['tcp', 'mqtt', 'udp', 'ntp', 'network'] } },
      },
      query: { type: 'string', title: 'GraphQL query', ui: { visibleWhen: { field: 'type', equals: 'graphql' } } },
      jsonPath: { type: 'string', title: 'JSON path', ui: { visibleWhen: { field: 'type', equals: 'json' } } },
      expect: { type: 'string', title: 'Expected value', ui: { visibleWhen: { field: 'type', equals: 'json' } } },
      recordType: {
        type: 'string',
        title: 'DNS record type',
        default: 'A',
        oneOf: DNS_RECORD_TYPES.map((recordType) => ({ const: recordType, title: recordType })),
        ui: { visibleWhen: { field: 'type', equals: 'dns' } },
      },
      autoIncident: { type: 'boolean', title: 'Open incidents automatically', ui: { widget: 'checkbox' } },
      failThreshold: {
        type: 'integer',
        title: 'Failures before opening an incident',
        minimum: 1,
        default: 3,
        ui: { visibleWhen: { field: 'autoIncident', equals: true } },
      },
      successThreshold: {
        type: 'integer',
        title: 'Successful checks before resolving an incident',
        minimum: 1,
        default: 2,
        ui: { visibleWhen: { field: 'autoIncident', equals: true } },
      },
    },
    required: ['id', 'name', 'url', 'host'],
  };
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

    const monitor: MonitorTarget = { id: stringValue(values, 'id'), name: stringValue(values, 'name'), type };
    if (values['intervalSeconds'] !== '' && values['intervalSeconds'] !== undefined) {
      monitor.intervalSeconds = Number(values['intervalSeconds']);
    }
    if (usesUrl) {
      monitor.url = stringValue(values, 'url');
    } else {
      monitor.host = stringValue(values, 'host');
    }
    if (type === 'graphql' && stringValue(values, 'query')) {
      monitor.query = stringValue(values, 'query');
    }
    if (type === 'json') {
      if (stringValue(values, 'jsonPath')) monitor.jsonPath = stringValue(values, 'jsonPath');
      if (stringValue(values, 'expect')) monitor.expect = stringValue(values, 'expect');
    }
    if (type === 'dns' && stringValue(values, 'recordType')) {
      monitor.recordType = stringValue(values, 'recordType');
    }
    if (!usesUrl && values['port'] !== '' && values['port'] !== undefined) {
      monitor.port = Number(values['port']);
    }
    monitor.autoIncident = values['autoIncident'] === true;
    if (monitor.autoIncident) {
      monitor.failThreshold = Number(values['failThreshold']) || 3;
      monitor.successThreshold = Number(values['successThreshold']) || 2;
    }

    if (!monitor.id || !monitor.name || (usesUrl ? !monitor.url : !monitor.host)) {
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
        <Typography
          as="h2"
          variant="h3"
          className="monitors__title"
        >
          {t(($) => $.monitors.title, { ns: 'mp.service-monitor', defaultValue: 'Monitors' })}
        </Typography>
        <Typography
          as="p"
          variant="body-sm"
          className="monitors__subtitle"
        >
          {t(($) => $.monitors.subtitle, {
            ns: 'mp.service-monitor',
            defaultValue: 'Configured at runtime · default interval {interval}s.',
            interval: defaultIntervalSeconds,
          })}
        </Typography>
        <Button
          onClick={() => {
            cancelEdit();
            setFormOpen(true);
          }}
        >
          <IconPlus aria-hidden="true" />{' '}
          {t(($) => $.monitors.add, { ns: 'mp.service-monitor', defaultValue: 'Add monitor' })}
        </Button>
      </div>

      <ul className="monitors__list">
        {monitors.map((monitor) => (
          <li
            key={monitor.id}
            className="monitors__item"
          >
            <div className="monitors__item-main">
              <Badge
                variant="info"
                size="sm"
                className="monitors__badge"
              >
                {TYPE_LABELS[monitor.type ?? 'http']}
              </Badge>
              <span className="monitors__name">{monitor.name}</span>
              <span className="monitors__target">{monitor.url ?? monitor.host}</span>
            </div>
            <div className="monitors__item-side">
              <span className="monitors__interval">{monitor.intervalSeconds ?? defaultIntervalSeconds}s</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => edit(monitor)}
                aria-label={t(($) => $.monitors.editAria, {
                  ns: 'mp.service-monitor',
                  defaultValue: 'Edit {name}',
                  name: monitor.name,
                })}
              >
                <IconPencil aria-hidden="true" />{' '}
                {t(($) => $.monitors.edit, { ns: 'mp.service-monitor', defaultValue: 'Edit' })}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void onDelete(monitor.id)}
                aria-label={t(($) => $.monitors.removeAria, {
                  ns: 'mp.service-monitor',
                  defaultValue: 'Remove {name}',
                  name: monitor.name,
                })}
                className="monitors__remove"
              >
                <IconTrash aria-hidden="true" />{' '}
                {t(($) => $.monitors.remove, { ns: 'mp.service-monitor', defaultValue: 'Remove' })}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog
        open={formOpen}
        title={
          editingId
            ? t(($) => $.monitors.editTitle, { ns: 'mp.service-monitor', defaultValue: 'Edit monitor' })
            : t(($) => $.monitors.add, { ns: 'mp.service-monitor', defaultValue: 'Add monitor' })
        }
        size="xl"
        onUpdateOpen={(open) => {
          if (!open) cancelEdit();
        }}
      >
        <SchemaForm
          key={editingId ?? 'new'}
          className="monitors__form"
          schema={monitorSchema(editingId !== null, defaultIntervalSeconds)}
          modelValue={form}
          onUpdateModelValue={setForm}
          onSubmit={(values, isValid) => void submit(values, isValid)}
          disabled={busy}
        />
        {error ? <p className="monitors__error">{error}</p> : null}
      </Dialog>
    </section>
  );
}
