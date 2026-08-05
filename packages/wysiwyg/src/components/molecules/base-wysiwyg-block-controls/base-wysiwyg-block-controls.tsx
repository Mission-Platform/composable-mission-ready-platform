import { h, type MpElement, type MpProperties } from '@mission-platform/forge';
import { IconAlignCenter, IconAlignJustify, IconAlignLeft, IconAlignRight, IconArrow } from '@mission-platform/icons';

import { type WysiwygBlockAlign } from '../../../utils/blocks';
import { resolveLabels, type WysiwygLabels } from '../../../utils/labels';
import { BaseWysiwygToolbarButton } from '../../atoms/base-wysiwyg-toolbar-button';

import styles from './base-wysiwyg-block-controls.module.scss';

const ICON_SIZE = 'sm';

/** The position + size of the block the controls are outlining (relative to the editor body). */
export interface WysiwygBlockControlsGeometry {
  /** Offset from the top of the editor body, in pixels. */
  top: number;
  /** Offset from the left of the editor body, in pixels. */
  left: number;
  /** The block's rendered width, in pixels. */
  width: number;
  /** The block's rendered height, in pixels. */
  height: number;
}

export interface WysiwygBlockControlsProperties extends MpProperties {
  /** Whether the outline + controls are shown. */
  visible?: boolean;
  /** Where to position the outline (omit to render nothing). */
  geometry?: WysiwygBlockControlsGeometry;
  /** The alignment currently applied to the block (highlights the matching control). */
  activeAlign?: WysiwygBlockAlign;
  /** Whether the block can be moved up (has a previous sibling). */
  canMoveUp?: boolean;
  /** Whether the block can be moved down (has a next sibling). */
  canMoveDown?: boolean;
  /** Overridable labels (English defaults). */
  labels?: Partial<WysiwygLabels>;
  /** Move the outlined block up one position. */
  onMoveUp?: () => void;
  /** Move the outlined block down one position. */
  onMoveDown?: () => void;
  /** Apply an alignment to the outlined block. */
  onAlign?: (align: WysiwygBlockAlign) => void;
}

/**
 * `BaseWysiwygBlockControls` — the per-block editing overlay for
 * {@link BaseWysiwygEditor}, authored once in the neutral JSX dialect.
 *
 * When the pointer hovers a block (or the caret sits inside one) the editor
 * feeds this component the block's {@link WysiwygBlockControlsGeometry}; it then
 * draws an **outline** over that block plus a floating control bar to move the
 * block up/down and to change its alignment/justification. The overlay itself is
 * pointer-transparent so it never blocks editing, while the control bar opts back
 * in to pointer events and suppresses `mousedown` default so using it never
 * steals the selection from the editing surface.
 */
export function BaseWysiwygBlockControls(properties: Readonly<WysiwygBlockControlsProperties>): MpElement {
  const labels = resolveLabels(properties.labels);
  const { visible = false, geometry } = properties;

  if (!visible || geometry === undefined) {
    return <div className={styles['wysiwyg-block-controls__hidden']} />;
  }

  const preventFocusLoss = (event: MouseEvent): void => event.preventDefault();
  const align = (value: WysiwygBlockAlign): void => properties.onAlign?.(value);

  return (
    <div
      aria-hidden="true"
      className={styles['wysiwyg-block-controls']}
      style={{
        top: `${geometry.top}px`,
        left: `${geometry.left}px`,
        width: `${geometry.width}px`,
        height: `${geometry.height}px`,
      }}
    >
      <div
        className={styles['wysiwyg-block-controls__bar']}
        role="toolbar"
        aria-label={labels.blockControls}
        onMousedown={preventFocusLoss}
      >
        <BaseWysiwygToolbarButton
          label={labels.moveBlockUp}
          disabled={!(properties.canMoveUp ?? false)}
          onClick={() => properties.onMoveUp?.()}
        >
          <IconArrow
            direction="up"
            size={ICON_SIZE}
          />
        </BaseWysiwygToolbarButton>
        <BaseWysiwygToolbarButton
          label={labels.moveBlockDown}
          disabled={!(properties.canMoveDown ?? false)}
          onClick={() => properties.onMoveDown?.()}
        >
          <IconArrow
            direction="down"
            size={ICON_SIZE}
          />
        </BaseWysiwygToolbarButton>
        <BaseWysiwygToolbarButton
          label={labels.alignLeft}
          active={properties.activeAlign === 'alignLeft'}
          onClick={() => align('alignLeft')}
        >
          <IconAlignLeft size={ICON_SIZE} />
        </BaseWysiwygToolbarButton>
        <BaseWysiwygToolbarButton
          label={labels.alignCenter}
          active={properties.activeAlign === 'alignCenter'}
          onClick={() => align('alignCenter')}
        >
          <IconAlignCenter size={ICON_SIZE} />
        </BaseWysiwygToolbarButton>
        <BaseWysiwygToolbarButton
          label={labels.alignRight}
          active={properties.activeAlign === 'alignRight'}
          onClick={() => align('alignRight')}
        >
          <IconAlignRight size={ICON_SIZE} />
        </BaseWysiwygToolbarButton>
        <BaseWysiwygToolbarButton
          label={labels.alignJustify}
          active={properties.activeAlign === 'alignJustify'}
          onClick={() => align('alignJustify')}
        >
          <IconAlignJustify size={ICON_SIZE} />
        </BaseWysiwygToolbarButton>
      </div>
    </div>
  );
}
