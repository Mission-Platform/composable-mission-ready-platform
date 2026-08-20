import { ForgeDropdown } from '@mission-platform/float';
import { h, type MpElement, useState } from '@mission-platform/forge';
import { ForgeIconChevron } from '@mission-platform/icons';

import { BLOCK_FORMAT_COMMANDS, type WysiwygCommand } from '../../../utils/commands';
import { blockFormatLabel, resolveLabels, type WysiwygLabels } from '../../../utils/labels';

import styles from './forge-wysiwyg-block-menu.module.scss';

export interface WysiwygBlockMenuProperties {
  /** The block-format command currently applied to the selection. Defaults to `'paragraph'`. */
  activeFormat?: WysiwygCommand;
  /** Disable the menu. */
  disabled?: boolean;
  /** Overridable labels (English defaults). */
  labels?: Partial<WysiwygLabels>;
  /** Invoked with the chosen block-format command. */
  onSelect?: (command: WysiwygCommand) => void;
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
