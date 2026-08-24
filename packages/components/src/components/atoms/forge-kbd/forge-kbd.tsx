import { classNames, type MpChild, type MpElement } from '@mission-platform/forge';

import styles from './forge-kbd.module.scss';

/** Keyboard key size. */
export type KbdSize = 'sm' | 'md' | 'lg';

export interface KbdProperties {
  /** Key content rendered in the default slot. */
  children?: MpChild | readonly MpChild[];
  /** Key size. Defaults to `'md'`. */
  size?: KbdSize;
  /** Whether the key is visually pressed. */
  pressed?: boolean;
}

/** A semantic keyboard key/chord label rendered in the neutral JSX dialect. */
export function ForgeKbd(properties: Readonly<KbdProperties>): MpElement {
  const { size = 'md', pressed = false } = properties;
  const className = classNames(styles['forge-kbd'], styles[`forge-kbd--${size}`], {
    [styles['forge-kbd--pressed']]: pressed,
  });

  return <kbd className={className}>{properties.children}</kbd>;
}
