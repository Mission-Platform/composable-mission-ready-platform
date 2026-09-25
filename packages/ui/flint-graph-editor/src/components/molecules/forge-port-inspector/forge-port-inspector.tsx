import { classNames, type MpElement } from '@mission-platform/forge-jsx';

import styles from './forge-port-inspector.module.scss';

export interface PortInspectorProperties {
  readonly portName: string;
  readonly portType: string;
  readonly value: unknown;
  readonly direction: 'input' | 'output';
  readonly screenX: number;
  readonly screenY: number;
  readonly isTrap?: boolean;
  readonly className?: string;
}

/**
 * Formats a raw port inspection value into a displayable string.
 */
function formatInspectorValue(value: unknown): string {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value ?? 'undefined');
}

/**
 * Returns color styling for port direction tags.
 */
function getDirectionBadgeStyle(direction: 'input' | 'output') {
  return direction === 'output'
    ? {
        backgroundColor: 'rgba(31, 111, 235, 0.2)',
        color: '#58a6ff',
      }
    : {
        backgroundColor: 'rgba(139, 148, 158, 0.2)',
        color: '#8b949e',
      };
}

/**
 * Framework-neutral Forge popover for live port inspection during trace replay.
 */
export function ForgePortInspector(properties: Readonly<PortInspectorProperties>): MpElement {
  const formattedValue = formatInspectorValue(properties.value);
  const badgeStyle = getDirectionBadgeStyle(properties.direction);

  return (
    <div
      role="tooltip"
      aria-label="Port value inspector"
      className={classNames(styles.portPopover, properties.className)}
      style={{
        left: `${properties.screenX + 10}px`,
        top: `${properties.screenY - 14}px`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '2px',
        }}
      >
        <span style={{ fontWeight: 600, color: '#f0f6fc' }}>{properties.portName}</span>
        <span style={{ color: '#8b949e', fontSize: '10px' }}>({properties.portType})</span>
        <span
          style={{
            fontSize: '9px',
            textTransform: 'uppercase',
            padding: '1px 4px',
            borderRadius: '3px',
            ...badgeStyle,
          }}
        >
          {properties.direction}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: '#8b949e' }}>Value:</span>
        <span
          style={{
            color: properties.isTrap ? '#f85149' : '#3fb950',
            fontWeight: 600,
          }}
        >
          {formattedValue}
        </span>
      </div>
    </div>
  );
}
