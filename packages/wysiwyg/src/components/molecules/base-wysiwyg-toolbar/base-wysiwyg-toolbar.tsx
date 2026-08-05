import { h, type MpElement, type MpProperties } from '@mission-platform/forge';
import {
  IconAlignCenter,
  IconAlignJustify,
  IconAlignLeft,
  IconAlignRight,
  IconBold,
  IconBulletList,
  IconCodeBlock,
  IconEye,
  IconImage,
  IconItalic,
  IconLink,
  IconNumberedList,
  IconRotateCcw,
  IconRotateCw,
  IconStrikethrough,
  IconUnderline,
} from '@mission-platform/icons';

import { type WysiwygCommand } from '../../../utils/commands';
import { resolveLabels, type WysiwygLabels } from '../../../utils/labels';
import { BaseWysiwygToolbarButton } from '../../atoms/base-wysiwyg-toolbar-button';
import { BaseWysiwygBlockMenu } from '../base-wysiwyg-block-menu';

import styles from './base-wysiwyg-toolbar.module.scss';

const ICON_SIZE = 'sm';

/**
 * A single, user-configurable toolbar control.
 *
 * Each item is a plain data object describing one button: its accessible
 * `label`, its pressed/active `state`, whether it is `disabled`, the `action`
 * (click handler) to run when it is clicked, and the `icon` (or any node) to
 * render inside it. Passing an array of these to {@link WysiwygToolbarProperties.items}
 * fully replaces the built-in formatting controls with a custom set.
 */
export interface WysiwygToolbarItem {
  /** Accessible label (also the tooltip) for the control. */
  label: string;
  /** Whether the control represents an active/pressed state. */
  state?: boolean;
  /** Whether the control is non-interactive. */
  disabled?: boolean;
  /** The click handler invoked when the control is clicked. */
  action: () => void;
  /** The icon (or any node) rendered inside the control. */
  icon?: MpElement;
}

export interface WysiwygToolbarProperties extends MpProperties {
  /**
   * A user-configurable list of toolbar controls. When provided, it fully
   * replaces the built-in formatting buttons (including the block-format
   * dropdown): each object supplies its own `label`, `state`, `disabled` flag
   * and `action` click handler (plus an optional `icon`). When omitted, the
   * default controls are rendered and `onCommand`/`onSelectBlock`/
   * `onInsertCodeBlock` are used to report activations.
   */
  items?: WysiwygToolbarItem[];
  /** Invoked with the command to run when a default toolbar button is clicked. */
  onCommand?: (command: WysiwygCommand) => void;
  /** The block-format command currently applied to the selection (drives the dropdown). */
  blockFormat?: WysiwygCommand;
  /** Invoked with the block-format command chosen from the dropdown. */
  onSelectBlock?: (command: WysiwygCommand) => void;
  /** Invoked when the "insert code block" control is clicked. */
  onInsertCodeBlock?: () => void;
  /** The toggle commands (bold/italic/…) currently active for the selection. */
  activeCommands?: WysiwygCommand[];
  /** Disable every control. */
  disabled?: boolean;
  /** Overridable labels (English defaults). */
  labels?: Partial<WysiwygLabels>;
  /** Render the "HTML source" toggle at the end of the toolbar. Defaults to `false`. */
  showSourceToggle?: boolean;
  /** Whether the source view is currently active. */
  sourceActive?: boolean;
  /** Invoked when the source toggle is activated. */
  onToggleSource?: () => void;
}

/**
 * `BaseWysiwygToolbar` — the formatting toolbar for {@link BaseWysiwygEditor},
 * authored once in the neutral JSX dialect.
 *
 * By default it renders a **block-format dropdown** ({@link BaseWysiwygBlockMenu}
 * — Paragraph, Headings 1-6, Block Quote, Monospace) followed by grouped icon
 * buttons ({@link BaseWysiwygToolbarButton}, itself composing the components
 * package's `BaseButton`) whose glyphs come from `@mission-platform/icons`.
 * Buttons emit a high-level {@link WysiwygCommand} via `onCommand`; the
 * block-format dropdown reports through `onSelectBlock`; and the code-block
 * control (which inserts a non-editable `BaseCodeBlock`) reports through
 * `onInsertCodeBlock`.
 *
 * The toolbar is also fully **user configurable**: pass an array of
 * {@link WysiwygToolbarItem} objects to `items` to replace the built-in controls
 * with your own. The root suppresses `mousedown` default so clicking a control
 * never steals the selection away from the editing surface.
 */
export function BaseWysiwygToolbar(properties: Readonly<WysiwygToolbarProperties>): MpElement {
  const labels = resolveLabels(properties.labels);
  const disabled = properties.disabled ?? false;
  const active = properties.activeCommands ?? [];

  const isActive = (command: WysiwygCommand): boolean => active.includes(command);
  const run = (command: WysiwygCommand): void => properties.onCommand?.(command);
  const preventFocusLoss = (event: MouseEvent): void => event.preventDefault();

  // Custom `items` fully replace the built-ins (including the block dropdown);
  // otherwise render the default button groups plus the leading block menu.
  const groups: WysiwygToolbarItem[][] = properties.items
    ? [properties.items]
    : buildDefaultGroups(labels, disabled, isActive, run, () => properties.onInsertCodeBlock?.());

  const blockMenu = properties.items ? undefined : (
    <div className={styles['wysiwyg-toolbar__group']}>
      <BaseWysiwygBlockMenu
        activeFormat={properties.blockFormat}
        disabled={disabled}
        labels={properties.labels}
        onSelect={(command: WysiwygCommand) => properties.onSelectBlock?.(command)}
      />
    </div>
  );

  return (
    <div
      className={styles['wysiwyg-toolbar']}
      role="toolbar"
      aria-label={labels.toolbar}
      onMousedown={preventFocusLoss}
    >
      {blockMenu}

      {groups.map((group) => (
        <div
          key={group.map((item) => item.label).join('|')}
          className={styles['wysiwyg-toolbar__group']}
        >
          {group.map((item) => (
            <BaseWysiwygToolbarButton
              key={item.label}
              label={item.label}
              active={item.state ?? false}
              disabled={item.disabled ?? disabled}
              onClick={item.action}
            >
              {item.icon}
            </BaseWysiwygToolbarButton>
          ))}
        </div>
      ))}

      {properties.showSourceToggle ? (
        <div className={[styles['wysiwyg-toolbar__group'], styles['wysiwyg-toolbar__group--end']]}>
          <BaseWysiwygToolbarButton
            label={labels.toggleSource}
            active={properties.sourceActive ?? false}
            disabled={disabled}
            onClick={() => properties.onToggleSource?.()}
          >
            <IconEye size={ICON_SIZE} />
          </BaseWysiwygToolbarButton>
        </div>
      ) : undefined}
    </div>
  );
}

/**
 * Build the default, command-driven toolbar button groups as plain
 * {@link WysiwygToolbarItem} data — the same shape a caller can supply through
 * `items`. Each formatting item's `action` reports its {@link WysiwygCommand}
 * back through `run` (wired to `onCommand`); the code-block item runs
 * `insertCodeBlock` (wired to `onInsertCodeBlock`). The block-format dropdown is
 * rendered separately (it is not a button).
 */
function buildDefaultGroups(
  labels: WysiwygLabels,
  disabled: boolean,
  isActive: (command: WysiwygCommand) => boolean,
  run: (command: WysiwygCommand) => void,
  insertCodeBlock: () => void,
): WysiwygToolbarItem[][] {
  return [
    [
      {
        label: labels.bold,
        state: isActive('bold'),
        disabled,
        action: () => run('bold'),
        icon: <IconBold size={ICON_SIZE} />,
      },
      {
        label: labels.italic,
        state: isActive('italic'),
        disabled,
        action: () => run('italic'),
        icon: <IconItalic size={ICON_SIZE} />,
      },
      {
        label: labels.underline,
        state: isActive('underline'),
        disabled,
        action: () => run('underline'),
        icon: <IconUnderline size={ICON_SIZE} />,
      },
      {
        label: labels.strikethrough,
        state: isActive('strikethrough'),
        disabled,
        action: () => run('strikethrough'),
        icon: <IconStrikethrough size={ICON_SIZE} />,
      },
    ],
    [
      {
        label: labels.bulletList,
        disabled,
        action: () => run('bulletList'),
        icon: <IconBulletList size={ICON_SIZE} />,
      },
      {
        label: labels.numberedList,
        disabled,
        action: () => run('numberedList'),
        icon: <IconNumberedList size={ICON_SIZE} />,
      },
    ],
    [
      { label: labels.codeBlock, disabled, action: insertCodeBlock, icon: <IconCodeBlock size={ICON_SIZE} /> },
      { label: labels.link, disabled, action: () => run('link'), icon: <IconLink size={ICON_SIZE} /> },
      { label: labels.image, disabled, action: () => run('image'), icon: <IconImage size={ICON_SIZE} /> },
    ],
    [
      { label: labels.alignLeft, disabled, action: () => run('alignLeft'), icon: <IconAlignLeft size={ICON_SIZE} /> },
      {
        label: labels.alignCenter,
        disabled,
        action: () => run('alignCenter'),
        icon: <IconAlignCenter size={ICON_SIZE} />,
      },
      {
        label: labels.alignRight,
        disabled,
        action: () => run('alignRight'),
        icon: <IconAlignRight size={ICON_SIZE} />,
      },
      {
        label: labels.alignJustify,
        disabled,
        action: () => run('alignJustify'),
        icon: <IconAlignJustify size={ICON_SIZE} />,
      },
    ],
    [
      { label: labels.undo, disabled, action: () => run('undo'), icon: <IconRotateCcw size={ICON_SIZE} /> },
      { label: labels.redo, disabled, action: () => run('redo'), icon: <IconRotateCw size={ICON_SIZE} /> },
    ],
  ];
}
