'use client';

import { ForgeDialog } from '@mission-platform/components';
import { ForgeSchemaForm, type FormValues, type SchemaFormDefinition } from '@mission-platform/forms';
import { useI18n } from '@mission-platform/i18n';

import { PROBE_TYPES, type ProbeType } from '@/monitoring/types';

/** Human labels for each probe type shown in the picker. */
export const TYPE_LABELS: Record<ProbeType, string> = {
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
export const URL_TYPES: ReadonlySet<ProbeType> = new Set<ProbeType>(['http', 'json', 'graphql']);

/** DNS resource record types supported by the monitor selector. */
const DNS_RECORD_TYPES = ['A', 'AAAA', 'CAA', 'CNAME', 'MX', 'NAPTR', 'NS', 'PTR', 'SOA', 'SRV', 'TXT'] as const;

export const EMPTY_FORM: FormValues = {
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

interface MonitorFormProperties {
  readonly open: boolean;
  readonly editingId: string | null;
  readonly defaultIntervalSeconds: number;
  readonly form: FormValues;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onUpdateForm: (values: FormValues) => void;
  readonly onSubmit: (values: FormValues, isValid: boolean) => void;
  readonly onCancel: () => void;
}

/**
 * The add/edit monitor dialog. Purely presentational: the container owns the
 * form state and validation (through `sanitizeMonitor`); this component renders
 * the schema-driven form and surfaces submit/cancel back through callbacks.
 */
export function MonitorForm({
  open,
  editingId,
  defaultIntervalSeconds,
  form,
  busy,
  error,
  onUpdateForm,
  onSubmit,
  onCancel,
}: MonitorFormProperties) {
  const { t } = useI18n();
  return (
    <ForgeDialog
      open={open}
      title={
        editingId
          ? t(($) => $.monitors.editTitle, { ns: 'mp.service-monitor', defaultValue: 'Edit monitor' })
          : t(($) => $.monitors.add, { ns: 'mp.service-monitor', defaultValue: 'Add monitor' })
      }
      size="xl"
      onUpdateOpen={(next) => {
        if (!next) onCancel();
      }}
    >
      <ForgeSchemaForm
        key={editingId ?? 'new'}
        className="monitors__form"
        schema={monitorSchema(editingId !== null, defaultIntervalSeconds)}
        modelValue={form}
        onUpdateModelValue={onUpdateForm}
        onSubmit={(values, isValid) => onSubmit(values, isValid)}
        disabled={busy}
      />
      {error ? <p className="monitors__error">{error}</p> : null}
    </ForgeDialog>
  );
}
