'use client';

import { ForgeButton } from '@mission-platform/components';
import { ForgeDialog } from '@mission-platform/float';
import { ForgeSchemaForm, type FormValues, type SchemaFormDefinition } from '@mission-platform/forms';
import { useI18n } from '@mission-platform/i18n';
import { ForgeContainer } from '@mission-platform/layouts';
import { ForgeTypography } from '@mission-platform/typography';
import { useState } from 'react';

import { maintenanceStatus, validMaintenanceRange } from '@/monitoring/incidents';

import { ServiceMonitorShell } from '../layouts/service-monitor-shell';
import { formatDateTime } from '../utils/format-date';

import type { Incident, MaintenanceWindow, MonitorTarget } from '@/monitoring/types';

type DialogKind = 'incident' | 'update' | 'report' | 'maintenance' | null;

const UPDATE_SCHEMA: SchemaFormDefinition = {
  type: 'object',
  properties: {
    message: { type: 'string', title: 'Progress update', minLength: 1, ui: { widget: 'textarea' } },
    status: {
      type: 'string',
      title: 'Status',
      oneOf: [
        { const: '', title: 'No status change' },
        { const: 'identified', title: 'Identified' },
        { const: 'monitoring', title: 'Monitoring' },
        { const: 'resolved', title: 'Resolved' },
      ],
    },
  },
  required: ['message'],
};

const REPORT_SCHEMA: SchemaFormDefinition = {
  type: 'object',
  properties: {
    report: {
      type: 'string',
      title: 'Post-incident report',
      minLength: 1,
      ui: { widget: 'textarea', placeholder: 'Summary, impact, root cause, and follow-up actions' },
    },
  },
  required: ['report'],
};

function serviceOptions(monitors: MonitorTarget[]) {
  return [
    { const: '', title: 'All services' },
    ...monitors.map((monitor) => ({ const: monitor.id, title: monitor.name })),
  ];
}

function incidentSchema(monitors: MonitorTarget[]): SchemaFormDefinition {
  return {
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Incident title', minLength: 1 },
      description: { type: 'string', title: 'What is happening?', ui: { widget: 'textarea' } },
      serviceId: { type: 'string', title: 'Service', oneOf: serviceOptions(monitors) },
      severity: {
        type: 'string',
        title: 'Severity',
        oneOf: [
          { const: 'minor', title: 'Minor' },
          { const: 'major', title: 'Major' },
          { const: 'critical', title: 'Critical' },
        ],
      },
    },
    required: ['title'],
  };
}

function maintenanceSchema(monitors: MonitorTarget[]): SchemaFormDefinition {
  return {
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Maintenance title', minLength: 1 },
      description: { type: 'string', title: 'Maintenance details', ui: { widget: 'textarea' } },
      serviceId: { type: 'string', title: 'Service', oneOf: serviceOptions(monitors) },
      startsAt: { type: 'string', format: 'date-time', title: 'Starts' },
      endsAt: { type: 'string', format: 'date-time', title: 'Ends' },
    },
    required: ['title', 'startsAt', 'endsAt'],
  };
}

function value(values: FormValues, key: string): string {
  return typeof values[key] === 'string' ? values[key] : '';
}

export function IncidentsView({
  initialIncidents,
  initialMaintenance,
  monitors,
}: {
  initialIncidents: Incident[];
  initialMaintenance: MaintenanceWindow[];
  monitors: MonitorTarget[];
}) {
  const { t } = useI18n();
  const [incidents, setIncidents] = useState(initialIncidents);
  const [maintenance, setMaintenance] = useState(initialMaintenance);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [incidentValues, setIncidentValues] = useState<FormValues>({
    title: '',
    description: '',
    serviceId: '',
    severity: 'minor',
  });
  const [updateValues, setUpdateValues] = useState<FormValues>({ message: '', status: '' });
  const [reportValues, setReportValues] = useState<FormValues>({ report: '' });
  const [maintenanceValues, setMaintenanceValues] = useState<FormValues>({
    title: '',
    description: '',
    serviceId: '',
    startsAt: '',
    endsAt: '',
  });
  const refresh = async () =>
    setIncidents(((await (await fetch('/api/incidents')).json()) as { incidents: Incident[] }).incidents);
  const refreshMaintenance = async () =>
    setMaintenance(
      ((await (await fetch('/api/maintenance')).json()) as { maintenance: MaintenanceWindow[] }).maintenance,
    );
  const close = () => {
    setDialog(null);
    setSelectedId(null);
  };
  const report = async (values: FormValues, isValid: boolean) => {
    if (!isValid) return;
    await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: value(values, 'title'),
        description: value(values, 'description'),
        serviceId: value(values, 'serviceId'),
        severity: value(values, 'severity'),
      }),
    });
    setIncidentValues({ title: '', description: '', serviceId: '', severity: 'minor' });
    close();
    await refresh();
  };
  const addUpdate = async (values: FormValues, isValid: boolean) => {
    if (!isValid) return;
    const status = value(values, 'status');
    await fetch('/api/incidents', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: selectedId,
        operation: 'update',
        message: value(values, 'message'),
        status: status || null,
      }),
    });
    setUpdateValues({ message: '', status: '' });
    close();
    await refresh();
  };
  const saveReport = async (values: FormValues, isValid: boolean) => {
    if (!isValid) return;
    await fetch('/api/incidents', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: selectedId, operation: 'post-report', report: value(values, 'report') }),
    });
    close();
    await refresh();
  };
  const openMaintenance = (window?: MaintenanceWindow) => {
    setSelectedId(window?.id ?? null);
    setMaintenanceValues({
      title: window?.title ?? '',
      description: window?.description ?? '',
      serviceId: window?.serviceId ?? '',
      startsAt: window ? toLocalInput(window.startsAt) : '',
      endsAt: window ? toLocalInput(window.endsAt) : '',
    });
    setDialog('maintenance');
  };
  const saveMaintenance = async (values: FormValues, isValid: boolean) => {
    const startsAt = new Date(value(values, 'startsAt')).getTime();
    const endsAt = new Date(value(values, 'endsAt')).getTime();
    if (!isValid || !validMaintenanceRange(startsAt, endsAt)) return;
    await fetch('/api/maintenance', {
      method: selectedId ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: selectedId,
        title: value(values, 'title'),
        description: value(values, 'description'),
        serviceId: value(values, 'serviceId'),
        startsAt,
        endsAt,
      }),
    });
    setMaintenanceValues({ title: '', description: '', serviceId: '', startsAt: '', endsAt: '' });
    close();
    await refreshMaintenance();
  };
  const cancelMaintenance = async (window: MaintenanceWindow) => {
    await fetch('/api/maintenance', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...window, cancelled: true }),
    });
    await refreshMaintenance();
  };
  return (
    <ServiceMonitorShell incidents={incidents}>
      <ForgeContainer
        variant="responsive"
        className="incidents-page"
      >
        <ForgeTypography
          as="h1"
          variant="h1"
        >
          {t(($) => $.incidents.title, { ns: 'mp.service-monitor', defaultValue: 'Incidents' })}
        </ForgeTypography>
        <ForgeButton onClick={() => setDialog('incident')}>
          {t(($) => $.incidents.reportButton, { ns: 'mp.service-monitor', defaultValue: 'Report incident' })}
        </ForgeButton>
        <section className="incident-list">
          {incidents.map((incident) => (
            <article key={incident.id}>
              <header>
                <strong>{incident.title}</strong>
                <span>
                  {incident.severity} · {incident.status}
                  {incident.automatic ? ' · automatic' : ''}
                </span>
              </header>
              <p>{incident.description}</p>
              <ol>
                {incident.updates.map((update) => (
                  <li key={update.id}>
                    <time>{formatDateTime(update.createdAt)}</time> — {update.message}
                    {update.status ? ` (${update.status})` : ''}
                  </li>
                ))}
              </ol>
              <ForgeButton
                size="sm"
                onClick={() => {
                  setSelectedId(incident.id);
                  setDialog('update');
                }}
              >
                {t(($) => $.incidents.addProgressUpdate, {
                  ns: 'mp.service-monitor',
                  defaultValue: 'Add progress update',
                })}
              </ForgeButton>
              {incident.status === 'resolved' ? (
                <ForgeButton
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedId(incident.id);
                    setReportValues({ report: incident.postIncidentReport ?? '' });
                    setDialog('report');
                  }}
                >
                  {incident.postIncidentReport
                    ? t(($) => $.incidents.editPostReport, {
                        ns: 'mp.service-monitor',
                        defaultValue: 'Edit post-incident report',
                      })
                    : t(($) => $.incidents.addPostReport, {
                        ns: 'mp.service-monitor',
                        defaultValue: 'Add post-incident report',
                      })}
                </ForgeButton>
              ) : null}
              {incident.postIncidentReport ? (
                <section>
                  <h3>
                    {t(($) => $.incidents.postIncidentReport, {
                      ns: 'mp.service-monitor',
                      defaultValue: 'Post-incident report',
                    })}
                  </h3>
                  <p>{incident.postIncidentReport}</p>
                </section>
              ) : null}
            </article>
          ))}
        </section>
        <header className="maintenance-head">
          <ForgeTypography
            as="h2"
            variant="h3"
          >
            {t(($) => $.incidents.plannedMaintenance, {
              ns: 'mp.service-monitor',
              defaultValue: 'Planned maintenance',
            })}
          </ForgeTypography>
          <ForgeButton onClick={() => openMaintenance()}>
            {t(($) => $.incidents.scheduleMaintenance, {
              ns: 'mp.service-monitor',
              defaultValue: 'Schedule maintenance',
            })}
          </ForgeButton>
        </header>
        <section className="incident-list">
          {maintenance.map((window) => (
            <article key={window.id}>
              <header>
                <strong>{window.title}</strong>
                <span>{maintenanceStatus(window)}</span>
              </header>
              <p>{window.description}</p>
              <p>
                {formatDateTime(window.startsAt)} – {formatDateTime(window.endsAt)}
              </p>
              <ForgeButton
                size="sm"
                variant="ghost"
                onClick={() => openMaintenance(window)}
              >
                {t(($) => $.incidents.edit, { ns: 'mp.service-monitor', defaultValue: 'Edit' })}
              </ForgeButton>
              {maintenanceStatus(window) === 'scheduled' ? (
                <ForgeButton
                  size="sm"
                  variant="ghost"
                  onClick={() => cancelMaintenance(window)}
                >
                  {t(($) => $.incidents.cancel, { ns: 'mp.service-monitor', defaultValue: 'Cancel' })}
                </ForgeButton>
              ) : null}
            </article>
          ))}
        </section>
        <ForgeDialog
          open={dialog === 'incident'}
          title={t(($) => $.incidents.reportAnIncident, {
            ns: 'mp.service-monitor',
            defaultValue: 'Report an incident',
          })}
          onUpdateOpen={(open) => !open && close()}
        >
          <ForgeSchemaForm
            className="incident-form"
            schema={incidentSchema(monitors)}
            modelValue={incidentValues}
            onUpdateModelValue={setIncidentValues}
            onSubmit={(values, valid) => void report(values, valid)}
          />
        </ForgeDialog>
        <ForgeDialog
          open={dialog === 'update'}
          title={t(($) => $.incidents.addProgressUpdate, {
            ns: 'mp.service-monitor',
            defaultValue: 'Add progress update',
          })}
          onUpdateOpen={(open) => !open && close()}
        >
          <ForgeSchemaForm
            className="incident-form"
            schema={UPDATE_SCHEMA}
            modelValue={updateValues}
            onUpdateModelValue={setUpdateValues}
            onSubmit={(values, valid) => void addUpdate(values, valid)}
          />
        </ForgeDialog>
        <ForgeDialog
          open={dialog === 'report'}
          title={t(($) => $.incidents.postIncidentReport, {
            ns: 'mp.service-monitor',
            defaultValue: 'Post-incident report',
          })}
          onUpdateOpen={(open) => !open && close()}
        >
          <ForgeSchemaForm
            className="incident-form"
            schema={REPORT_SCHEMA}
            modelValue={reportValues}
            onUpdateModelValue={setReportValues}
            onSubmit={(values, valid) => void saveReport(values, valid)}
          />
        </ForgeDialog>
        <ForgeDialog
          open={dialog === 'maintenance'}
          title={
            selectedId
              ? t(($) => $.incidents.editMaintenance, {
                  ns: 'mp.service-monitor',
                  defaultValue: 'Edit maintenance',
                })
              : t(($) => $.incidents.scheduleMaintenance, {
                  ns: 'mp.service-monitor',
                  defaultValue: 'Schedule maintenance',
                })
          }
          onUpdateOpen={(open) => !open && close()}
        >
          <ForgeSchemaForm
            className="incident-form"
            schema={maintenanceSchema(monitors)}
            modelValue={maintenanceValues}
            onUpdateModelValue={setMaintenanceValues}
            onSubmit={(values, valid) => void saveMaintenance(values, valid)}
          />
        </ForgeDialog>
      </ForgeContainer>
    </ServiceMonitorShell>
  );
}
function toLocalInput(timestamp: number): string {
  const date = new Date(timestamp - new Date(timestamp).getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}
