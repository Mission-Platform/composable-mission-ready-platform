'use client';

import { ForgeBadge, ForgeButton } from '@mission-platform/components';
import { useI18n } from '@mission-platform/i18n';
import { ForgeIconPencil, ForgeIconTrash } from '@mission-platform/icons';

import type { MonitorTarget } from '@/monitoring/types';

interface MonitorListItemProperties {
  readonly monitor: MonitorTarget;
  readonly typeLabel: string;
  readonly defaultIntervalSeconds: number;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}

/** A single monitor row with its type badge, target, interval and actions. */
export function MonitorListItem({
  monitor,
  typeLabel,
  defaultIntervalSeconds,
  onEdit,
  onDelete,
}: MonitorListItemProperties) {
  const { t } = useI18n();
  return (
    <li className="monitors__item">
      <div className="monitors__item-main">
        <ForgeBadge
          variant="info"
          size="sm"
          className="monitors__badge"
        >
          {typeLabel}
        </ForgeBadge>
        <span className="monitors__name">{monitor.name}</span>
        <span className="monitors__target">{monitor.url ?? monitor.host}</span>
      </div>
      <div className="monitors__item-side">
        <span className="monitors__interval">{monitor.intervalSeconds ?? defaultIntervalSeconds}s</span>
        <ForgeButton
          variant="ghost"
          size="sm"
          onClick={onEdit}
          aria-label={t(($) => $.monitors.editAria, {
            ns: 'mp.service-monitor',
            defaultValue: 'Edit {name}',
            name: monitor.name,
          })}
        >
          <ForgeIconPencil aria-hidden="true" />{' '}
          {t(($) => $.monitors.edit, { ns: 'mp.service-monitor', defaultValue: 'Edit' })}
        </ForgeButton>
        <ForgeButton
          variant="ghost"
          size="sm"
          onClick={onDelete}
          aria-label={t(($) => $.monitors.removeAria, {
            ns: 'mp.service-monitor',
            defaultValue: 'Remove {name}',
            name: monitor.name,
          })}
          className="monitors__remove"
        >
          <ForgeIconTrash aria-hidden="true" />{' '}
          {t(($) => $.monitors.remove, { ns: 'mp.service-monitor', defaultValue: 'Remove' })}
        </ForgeButton>
      </div>
    </li>
  );
}
