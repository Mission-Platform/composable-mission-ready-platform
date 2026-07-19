import { useI18n } from '@mission-platform/i18n/react';
import { useState } from 'react';

import { PROBE_TYPES, type MonitorTarget, type ProbeType } from '@/monitoring/types';

import { Badge, Button, IconPlus, IconTrash, Typography } from './mp';

interface MonitorManagerProps {
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
};

/** Probe types addressed by a URL rather than a host/port. */
const URL_TYPES: ReadonlySet<ProbeType> = new Set<ProbeType>(['http', 'json', 'graphql']);

const EMPTY_FORM = {
  id: '',
  name: '',
  type: 'http' as ProbeType,
  intervalSeconds: '',
  url: '',
  host: '',
  port: '',
  query: '',
  jsonPath: '',
  expect: '',
  recordType: '',
};

/**
 * Runtime monitor configuration UI. Lists the current monitors (each with its
 * own type and interval) and lets an operator add a new one or remove existing
 * ones — all of which is persisted server-side through the JSON API.
 */
export function MonitorManager({ monitors, defaultIntervalSeconds, onSave, onDelete }: MonitorManagerProps) {
  const { t } = useI18n();
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usesUrl = URL_TYPES.has(form.type);

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const monitor: MonitorTarget = { id: form.id.trim(), name: form.name.trim(), type: form.type };
    if (form.intervalSeconds.trim()) {
      monitor.intervalSeconds = Number(form.intervalSeconds);
    }
    if (usesUrl) {
      monitor.url = form.url.trim();
    } else {
      monitor.host = form.host.trim();
    }
    if (form.type === 'graphql' && form.query.trim()) {
      monitor.query = form.query.trim();
    }
    if (form.type === 'json') {
      if (form.jsonPath.trim()) monitor.jsonPath = form.jsonPath.trim();
      if (form.expect.trim()) monitor.expect = form.expect.trim();
    }
    if (form.type === 'dns' && form.recordType.trim()) {
      monitor.recordType = form.recordType.trim();
    }
    if (!usesUrl && form.port.trim()) {
      monitor.port = Number(form.port);
    }

    if (!monitor.id || !monitor.name || (usesUrl ? !monitor.url : !monitor.host)) {
      setError(t('monitors.error.required'));
      return;
    }

    setBusy(true);
    const ok = await onSave(monitor);
    setBusy(false);
    if (ok) {
      setForm(EMPTY_FORM);
    } else {
      setError(t('monitors.error.rejected'));
    }
  };

  return (
    <section
      className="monitors"
      aria-label="Monitor configuration"
    >
      <div className="monitors__head">
        <Typography
          as="h2"
          variant="h3"
          className="monitors__title"
        >
          {t('monitors.title')}
        </Typography>
        <Typography
          as="p"
          variant="body-sm"
          className="monitors__subtitle"
        >
          {t('monitors.subtitle', { interval: defaultIntervalSeconds })}
        </Typography>
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
                onClick={() => void onDelete(monitor.id)}
                aria-label={t('monitors.removeAria', { name: monitor.name })}
                className="monitors__remove"
              >
                <IconTrash aria-hidden="true" /> {t('monitors.remove')}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <form
        className="monitors__form"
        onSubmit={submit}
      >
        <div className="monitors__row">
          <input
            className="monitors__input"
            placeholder="id"
            value={form.id}
            onChange={(event) => set('id', event.target.value)}
            required
          />
          <input
            className="monitors__input"
            placeholder="Name"
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            required
          />
          <select
            className="monitors__input"
            value={form.type}
            onChange={(event) => set('type', event.target.value as ProbeType)}
            aria-label="Probe type"
          >
            {PROBE_TYPES.map((type) => (
              <option
                key={type}
                value={type}
              >
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <input
            className="monitors__input monitors__input--narrow"
            type="number"
            min={5}
            placeholder={`${defaultIntervalSeconds}s`}
            value={form.intervalSeconds}
            onChange={(event) => set('intervalSeconds', event.target.value)}
            aria-label="Interval in seconds"
          />
        </div>

        <div className="monitors__row">
          {usesUrl ? (
            <input
              className="monitors__input monitors__input--grow"
              placeholder="https://example.com/health"
              value={form.url}
              onChange={(event) => set('url', event.target.value)}
            />
          ) : (
            <>
              <input
                className="monitors__input monitors__input--grow"
                placeholder="host (e.g. example.com)"
                value={form.host}
                onChange={(event) => set('host', event.target.value)}
              />
              {form.type !== 'dns' ? (
                <input
                  className="monitors__input monitors__input--narrow"
                  type="number"
                  placeholder="port"
                  value={form.port}
                  onChange={(event) => set('port', event.target.value)}
                  aria-label="Port"
                />
              ) : null}
            </>
          )}
          {form.type === 'dns' ? (
            <input
              className="monitors__input monitors__input--narrow"
              placeholder="A"
              value={form.recordType}
              onChange={(event) => set('recordType', event.target.value)}
              aria-label="DNS record type"
            />
          ) : null}
          {form.type === 'graphql' ? (
            <input
              className="monitors__input monitors__input--grow"
              placeholder="{ __typename }"
              value={form.query}
              onChange={(event) => set('query', event.target.value)}
              aria-label="GraphQL query"
            />
          ) : null}
          {form.type === 'json' ? (
            <>
              <input
                className="monitors__input monitors__input--narrow"
                placeholder="status"
                value={form.jsonPath}
                onChange={(event) => set('jsonPath', event.target.value)}
                aria-label="JSON path"
              />
              <input
                className="monitors__input monitors__input--narrow"
                placeholder="ok"
                value={form.expect}
                onChange={(event) => set('expect', event.target.value)}
                aria-label="Expected value"
              />
            </>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            disabled={busy}
            loading={busy}
            className="monitors__add"
          >
            <IconPlus aria-hidden="true" /> {busy ? t('monitors.saving') : t('monitors.add')}
          </Button>
        </div>

        {error ? <p className="monitors__error">{error}</p> : null}
      </form>
    </section>
  );
}
