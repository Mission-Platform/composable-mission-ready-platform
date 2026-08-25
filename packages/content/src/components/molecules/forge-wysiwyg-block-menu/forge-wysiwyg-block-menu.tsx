import { ForgeDropdown } from '@mission-platform/float';
import { useState, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge';
import { ForgeIconChevron } from '@mission-platform/icons';

import { BLOCK_FORMAT_COMMANDS, type WysiwygCommand } from '../../../utils/commands';
import { blockFormatLabel, resolveLabels, type WysiwygLabels } from '../../../utils/labels';

import styles from './forge-wysiwyg-block-menu.module.scss';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface WysiwygBlockMenuStyleProperties {
  readonly 'editor-block-menu-item-active-font-weight'?: string;
  readonly 'editor-block-menu-item-focus-border'?: string;
  readonly 'editor-block-menu-item-focus-border-width'?: string;
  readonly 'editor-block-menu-item-padding-block'?: string;
  readonly 'editor-block-menu-item-padding-inline'?: string;
  readonly 'editor-block-menu-item-radius'?: string;
  readonly 'editor-block-menu-item-surface-hover'?: string;
  readonly 'editor-block-menu-item-text-active'?: string;
  readonly 'editor-block-menu-item-text-default'?: string;
  readonly 'editor-block-menu-list-gap'?: string;
  readonly 'editor-block-menu-list-padding'?: string;
  readonly 'editor-block-menu-list-radius'?: string;
  readonly 'editor-block-menu-list-surface'?: string;
  readonly 'editor-block-menu-list-text'?: string;
  readonly 'editor-block-menu-trigger-border'?: string;
  readonly 'editor-block-menu-trigger-border-width'?: string;
  readonly 'editor-block-menu-trigger-focus-border'?: string;
  readonly 'editor-block-menu-trigger-focus-border-width'?: string;
  readonly 'editor-block-menu-trigger-gap'?: string;
  readonly 'editor-block-menu-trigger-opacity-disabled'?: string;
  readonly 'editor-block-menu-trigger-padding-block'?: string;
  readonly 'editor-block-menu-trigger-padding-inline'?: string;
  readonly 'editor-block-menu-trigger-radius'?: string;
  readonly 'editor-block-menu-trigger-surface-hover'?: string;
  readonly 'editor-block-menu-trigger-text'?: string;
}

export type WysiwygBlockMenuStyle = CSSStyleProperties & {
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-item-active-font-weight'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-item-focus-border'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-item-focus-border-width'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-item-padding-block'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-item-padding-inline'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-item-radius'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-item-surface-hover'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-item-text-active'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-item-text-default'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-list-gap'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-list-padding'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-list-radius'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-list-surface'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-list-text'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-trigger-border'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-trigger-border-width'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-trigger-focus-border'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-trigger-focus-border-width'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-trigger-gap'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-trigger-opacity-disabled'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-trigger-padding-block'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-trigger-padding-inline'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-trigger-radius'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-trigger-surface-hover'?: string | undefined;
  readonly '--forge-wysiwyg-block-menu-editor-block-menu-trigger-text'?: string | undefined;
};

function createWysiwygBlockMenuStyle(
  properties: Readonly<WysiwygBlockMenuStyleProperties> | undefined,
): WysiwygBlockMenuStyle | undefined {
  return createForgeStyle({
    '--forge-wysiwyg-block-menu-editor-block-menu-item-active-font-weight':
      properties?.['editor-block-menu-item-active-font-weight'],
    '--forge-wysiwyg-block-menu-editor-block-menu-item-focus-border':
      properties?.['editor-block-menu-item-focus-border'],
    '--forge-wysiwyg-block-menu-editor-block-menu-item-focus-border-width':
      properties?.['editor-block-menu-item-focus-border-width'],
    '--forge-wysiwyg-block-menu-editor-block-menu-item-padding-block':
      properties?.['editor-block-menu-item-padding-block'],
    '--forge-wysiwyg-block-menu-editor-block-menu-item-padding-inline':
      properties?.['editor-block-menu-item-padding-inline'],
    '--forge-wysiwyg-block-menu-editor-block-menu-item-radius': properties?.['editor-block-menu-item-radius'],
    '--forge-wysiwyg-block-menu-editor-block-menu-item-surface-hover':
      properties?.['editor-block-menu-item-surface-hover'],
    '--forge-wysiwyg-block-menu-editor-block-menu-item-text-active': properties?.['editor-block-menu-item-text-active'],
    '--forge-wysiwyg-block-menu-editor-block-menu-item-text-default':
      properties?.['editor-block-menu-item-text-default'],
    '--forge-wysiwyg-block-menu-editor-block-menu-list-gap': properties?.['editor-block-menu-list-gap'],
    '--forge-wysiwyg-block-menu-editor-block-menu-list-padding': properties?.['editor-block-menu-list-padding'],
    '--forge-wysiwyg-block-menu-editor-block-menu-list-radius': properties?.['editor-block-menu-list-radius'],
    '--forge-wysiwyg-block-menu-editor-block-menu-list-surface': properties?.['editor-block-menu-list-surface'],
    '--forge-wysiwyg-block-menu-editor-block-menu-list-text': properties?.['editor-block-menu-list-text'],
    '--forge-wysiwyg-block-menu-editor-block-menu-trigger-border': properties?.['editor-block-menu-trigger-border'],
    '--forge-wysiwyg-block-menu-editor-block-menu-trigger-border-width':
      properties?.['editor-block-menu-trigger-border-width'],
    '--forge-wysiwyg-block-menu-editor-block-menu-trigger-focus-border':
      properties?.['editor-block-menu-trigger-focus-border'],
    '--forge-wysiwyg-block-menu-editor-block-menu-trigger-focus-border-width':
      properties?.['editor-block-menu-trigger-focus-border-width'],
    '--forge-wysiwyg-block-menu-editor-block-menu-trigger-gap': properties?.['editor-block-menu-trigger-gap'],
    '--forge-wysiwyg-block-menu-editor-block-menu-trigger-opacity-disabled':
      properties?.['editor-block-menu-trigger-opacity-disabled'],
    '--forge-wysiwyg-block-menu-editor-block-menu-trigger-padding-block':
      properties?.['editor-block-menu-trigger-padding-block'],
    '--forge-wysiwyg-block-menu-editor-block-menu-trigger-padding-inline':
      properties?.['editor-block-menu-trigger-padding-inline'],
    '--forge-wysiwyg-block-menu-editor-block-menu-trigger-radius': properties?.['editor-block-menu-trigger-radius'],
    '--forge-wysiwyg-block-menu-editor-block-menu-trigger-surface-hover':
      properties?.['editor-block-menu-trigger-surface-hover'],
    '--forge-wysiwyg-block-menu-editor-block-menu-trigger-text': properties?.['editor-block-menu-trigger-text'],
  }) as WysiwygBlockMenuStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface WysiwygBlockMenuProperties {
  /** The block-format command currently applied to the selection. Defaults to `'paragraph'`. */
  activeFormat?: WysiwygCommand;
  /** Disable the menu. */
  disabled?: boolean;
  /** Overridable labels (English defaults). */
  labels?: Partial<WysiwygLabels>;
  /** Invoked with the chosen block-format command. */
  onSelect?: (command: WysiwygCommand) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<WysiwygBlockMenuStyleProperties>;
}

/**
 * `ForgeWysiwygBlockMenu` — the block-style selector for {@link ForgeWysiwygEditor},
 * authored once in the neutral JSX dialect.
 *
 * It replaces the former heading/paragraph/quote buttons with a single
 * **dropdown** (composing the components package's `ForgeDropdown`): the trigger
 * shows the block format of the current selection, and the panel lists
 * Paragraph, Headings 1-6, Block Quote and the editable Monospace block. Picking
 * an entry emits the corresponding {@link WysiwygCommand} through `onSelect`. Both
 * the trigger and the menu suppress `mousedown` default so opening the menu or
 * choosing a format never steals the selection away from the editing surface.
 */
export function ForgeWysiwygBlockMenu(properties: Readonly<WysiwygBlockMenuProperties>): MpElement {
  const propertyStyle = createWysiwygBlockMenuStyle(properties.properties);

  const labels = resolveLabels(properties.labels);
  const disabled = properties.disabled ?? false;
  const activeFormat = properties.activeFormat ?? 'paragraph';
  const [open, setOpen] = useState<boolean>(false);

  // This handler intentionally captures the component-local event contract.
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const preventFocusLoss = (event: MouseEvent): void => event.preventDefault();

  const choose = (command: WysiwygCommand): void => {
    properties.onSelect?.(command);
    setOpen(false);
  };

  return (
    <ForgeDropdown
      matchTriggerWidth={false}
      open={open && !disabled ? true : false}
      placement="bottom-start"
      onUpdateOpen={(next: boolean) => setOpen(next)}
    >
      <button
        slot="trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={labels.blockFormat}
        className={styles['wysiwyg-block-menu__trigger']}
        disabled={disabled}
        style={propertyStyle}
        type="button"
        onMousedown={preventFocusLoss}
        onClick={() => setOpen(!open)}
      >
        <span className={styles['wysiwyg-block-menu__trigger-label']}>{blockFormatLabel(activeFormat, labels)}</span>
        <ForgeIconChevron
          direction={open ? 'up' : 'down'}
          size="sm"
        />
      </button>

      <ul
        className={styles['wysiwyg-block-menu__list']}
        role="menu"
        style={propertyStyle}
        onMousedown={preventFocusLoss}
      >
        {BLOCK_FORMAT_COMMANDS.map((command) => (
          <li
            key={command}
            role="none"
          >
            <button
              aria-checked={command === activeFormat}
              className={[
                styles['wysiwyg-block-menu__item'],
                {
                  [styles['wysiwyg-block-menu__item--active']]: command === activeFormat,
                },
              ]}
              role="menuitemradio"
              type="button"
              onClick={() => choose(command)}
            >
              {blockFormatLabel(command, labels)}
            </button>
          </li>
        ))}
      </ul>
    </ForgeDropdown>
  );
}
