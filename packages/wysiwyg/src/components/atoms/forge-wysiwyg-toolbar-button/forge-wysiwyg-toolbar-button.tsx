import { ForgeButton } from '@mission-platform/components';
import { h, type MpElement, type MpProperties } from '@mission-platform/forge';

import styles from './forge-wysiwyg-toolbar-button.module.scss';

export interface WysiwygToolbarButtonProperties extends MpProperties {
  /** Accessible label (also the tooltip) for the icon-only button. */
  label: string;
  /** Whether the button represents an active/pressed formatting state. */
  active?: boolean;
  /** Whether the button is non-interactive. */
  disabled?: boolean;
  /** Invoked when the button is clicked. */
  onClick?: () => void;
}

/**
 * `ForgeWysiwygToolbarButton` — a single icon-only toolbar control, authored once
 * in the neutral JSX dialect.
 *
 * It composes the write-once `ForgeButton` from `@mission-platform/components`
 * (the two-stage compiler re-points that import to each framework's built
 * subpath), rendering the caller's icon as its content. An active control uses
 * the `primary` variant and sets `aria-pressed`; an inactive one uses the
 * transparent `ghost` variant so the toolbar reads as a flat strip of icons.
 */
export function ForgeWysiwygToolbarButton(properties: Readonly<WysiwygToolbarButtonProperties>): MpElement {
  const active = properties.active ?? false;

  return (
    <span className={styles['wysiwyg-toolbar-button']}>
      <ForgeButton
        variant={active ? 'primary' : 'ghost'}
        size="sm"
        ariaLabel={properties.label}
        ariaPressed={active}
        disabled={properties.disabled ?? false}
        onClick={() => properties.onClick?.()}
      >
        {properties.children}
      </ForgeButton>
    </span>
  );
}
