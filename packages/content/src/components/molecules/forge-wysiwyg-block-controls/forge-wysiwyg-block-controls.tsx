import { createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge';
import {
  ForgeIconAlignCenter,
  ForgeIconAlignJustify,
  ForgeIconAlignLeft,
  ForgeIconAlignRight,
  ForgeIconArrow,
} from '@mission-platform/icons';

import { type WysiwygBlockAlign } from '../../../utils/blocks';
import { resolveLabels, type WysiwygLabels } from '../../../utils/labels';
import { ForgeWysiwygToolbarButton } from '../../atoms/forge-wysiwyg-toolbar-button';

import styles from './forge-wysiwyg-block-controls.module.scss';

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

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface WysiwygBlockControlsStyleProperties {
  readonly 'editor-block-controls-bar-border'?: string;
  readonly 'editor-block-controls-bar-border-width'?: string;
  readonly 'editor-block-controls-bar-radius'?: string;
  readonly 'editor-block-controls-bar-shadow'?: string;
  readonly 'editor-block-controls-bar-surface'?: string;
  readonly 'editor-block-controls-gap'?: string;
  readonly 'editor-block-controls-padding'?: string;
  readonly 'editor-block-controls-selection-border'?: string;
  readonly 'editor-block-controls-selection-border-width'?: string;
  readonly 'editor-block-controls-selection-radius'?: string;
}

export type WysiwygBlockControlsStyle = CSSStyleProperties & {
  readonly '--forge-wysiwyg-block-controls-editor-block-controls-bar-border'?: string | undefined;
  readonly '--forge-wysiwyg-block-controls-editor-block-controls-bar-border-width'?: string | undefined;
  readonly '--forge-wysiwyg-block-controls-editor-block-controls-bar-radius'?: string | undefined;
  readonly '--forge-wysiwyg-block-controls-editor-block-controls-bar-shadow'?: string | undefined;
  readonly '--forge-wysiwyg-block-controls-editor-block-controls-bar-surface'?: string | undefined;
  readonly '--forge-wysiwyg-block-controls-editor-block-controls-gap'?: string | undefined;
  readonly '--forge-wysiwyg-block-controls-editor-block-controls-padding'?: string | undefined;
  readonly '--forge-wysiwyg-block-controls-editor-block-controls-selection-border'?: string | undefined;
  readonly '--forge-wysiwyg-block-controls-editor-block-controls-selection-border-width'?: string | undefined;
  readonly '--forge-wysiwyg-block-controls-editor-block-controls-selection-radius'?: string | undefined;
};

function createWysiwygBlockControlsStyle(
  properties: Readonly<WysiwygBlockControlsStyleProperties> | undefined,
): WysiwygBlockControlsStyle | undefined {
  return createForgeStyle({
    '--forge-wysiwyg-block-controls-editor-block-controls-bar-border': properties?.['editor-block-controls-bar-border'],
    '--forge-wysiwyg-block-controls-editor-block-controls-bar-border-width':
      properties?.['editor-block-controls-bar-border-width'],
    '--forge-wysiwyg-block-controls-editor-block-controls-bar-radius': properties?.['editor-block-controls-bar-radius'],
    '--forge-wysiwyg-block-controls-editor-block-controls-bar-shadow': properties?.['editor-block-controls-bar-shadow'],
    '--forge-wysiwyg-block-controls-editor-block-controls-bar-surface':
      properties?.['editor-block-controls-bar-surface'],
    '--forge-wysiwyg-block-controls-editor-block-controls-gap': properties?.['editor-block-controls-gap'],
    '--forge-wysiwyg-block-controls-editor-block-controls-padding': properties?.['editor-block-controls-padding'],
    '--forge-wysiwyg-block-controls-editor-block-controls-selection-border':
      properties?.['editor-block-controls-selection-border'],
    '--forge-wysiwyg-block-controls-editor-block-controls-selection-border-width':
      properties?.['editor-block-controls-selection-border-width'],
    '--forge-wysiwyg-block-controls-editor-block-controls-selection-radius':
      properties?.['editor-block-controls-selection-radius'],
  }) as WysiwygBlockControlsStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface WysiwygBlockControlsProperties {
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<WysiwygBlockControlsStyleProperties>;
}

/**
 * `ForgeWysiwygBlockControls` — the per-block editing overlay for
 * {@link ForgeWysiwygEditor}, authored once in the neutral JSX dialect.
 *
 * When the pointer hovers a block (or the caret sits inside one) the editor
 * feeds this component the block's {@link WysiwygBlockControlsGeometry}; it then
 * draws an **outline** over that block plus a floating control bar to move the
 * block up/down and to change its alignment/justification. The overlay itself is
 * pointer-transparent so it never blocks editing, while the control bar opts back
 * in to pointer events and suppresses `mousedown` default so using it never
 * steals the selection from the editing surface.
 */
export function ForgeWysiwygBlockControls(properties: Readonly<WysiwygBlockControlsProperties>): MpElement {
  const propertyStyle = createWysiwygBlockControlsStyle(properties.properties);

  const labels = resolveLabels(properties.labels);
  const { visible = false, geometry } = properties;

  if (!visible || geometry === undefined) {
    return (
      <div
        className={styles['wysiwyg-block-controls__hidden']}
        style={propertyStyle}
      />
    );
  }

  // This handler intentionally captures the component-local event contract.
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const preventFocusLoss = (event: MouseEvent): void => event.preventDefault();
  const align = (value: WysiwygBlockAlign): void => properties.onAlign?.(value);

  return (
    <div
      aria-hidden="true"
      className={styles['wysiwyg-block-controls']}
      style={{
        ...propertyStyle,
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
        <ForgeWysiwygToolbarButton
          label={labels.moveBlockUp}
          disabled={!(properties.canMoveUp ?? false)}
          onClick={() => properties.onMoveUp?.()}
        >
          <ForgeIconArrow
            direction="up"
            size={ICON_SIZE}
          />
        </ForgeWysiwygToolbarButton>
        <ForgeWysiwygToolbarButton
          label={labels.moveBlockDown}
          disabled={!(properties.canMoveDown ?? false)}
          onClick={() => properties.onMoveDown?.()}
        >
          <ForgeIconArrow
            direction="down"
            size={ICON_SIZE}
          />
        </ForgeWysiwygToolbarButton>
        <ForgeWysiwygToolbarButton
          label={labels.alignLeft}
          active={properties.activeAlign === 'alignLeft'}
          onClick={() => align('alignLeft')}
        >
          <ForgeIconAlignLeft size={ICON_SIZE} />
        </ForgeWysiwygToolbarButton>
        <ForgeWysiwygToolbarButton
          label={labels.alignCenter}
          active={properties.activeAlign === 'alignCenter'}
          onClick={() => align('alignCenter')}
        >
          <ForgeIconAlignCenter size={ICON_SIZE} />
        </ForgeWysiwygToolbarButton>
        <ForgeWysiwygToolbarButton
          label={labels.alignRight}
          active={properties.activeAlign === 'alignRight'}
          onClick={() => align('alignRight')}
        >
          <ForgeIconAlignRight size={ICON_SIZE} />
        </ForgeWysiwygToolbarButton>
        <ForgeWysiwygToolbarButton
          label={labels.alignJustify}
          active={properties.activeAlign === 'alignJustify'}
          onClick={() => align('alignJustify')}
        >
          <ForgeIconAlignJustify size={ICON_SIZE} />
        </ForgeWysiwygToolbarButton>
      </div>
    </div>
  );
}
