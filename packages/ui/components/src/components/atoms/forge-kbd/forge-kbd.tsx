import {
  classNames,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import styles from './forge-kbd.module.scss';

/** Keyboard key size. */
export type KbdSize = 'sm' | 'md' | 'lg';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface KbdStyleProperties {
  readonly 'code-kbd-background'?: string;
  readonly 'code-kbd-border'?: string;
  readonly 'code-kbd-border-width'?: string;
  readonly 'code-kbd-padding-block'?: string;
  readonly 'code-kbd-padding-inline'?: string;
  readonly 'code-kbd-pressed-offset'?: string;
  readonly 'code-kbd-pressed-shadow'?: string;
  readonly 'code-kbd-radius'?: string;
  readonly 'code-kbd-text'?: string;
  readonly 'color-border-default'?: string;
  readonly 'font-family-mono'?: string;
  readonly 'font-size-lg'?: string;
  readonly 'font-size-md'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'font-weight-medium'?: string;
}

export type KbdStyle = CSSStyleProperties & {
  readonly '--forge-kbd-code-kbd-background'?: string | undefined;
  readonly '--forge-kbd-code-kbd-border'?: string | undefined;
  readonly '--forge-kbd-code-kbd-border-width'?: string | undefined;
  readonly '--forge-kbd-code-kbd-padding-block'?: string | undefined;
  readonly '--forge-kbd-code-kbd-padding-inline'?: string | undefined;
  readonly '--forge-kbd-code-kbd-pressed-offset'?: string | undefined;
  readonly '--forge-kbd-code-kbd-pressed-shadow'?: string | undefined;
  readonly '--forge-kbd-code-kbd-radius'?: string | undefined;
  readonly '--forge-kbd-code-kbd-text'?: string | undefined;
  readonly '--forge-kbd-color-border-default'?: string | undefined;
  readonly '--forge-kbd-font-family-mono'?: string | undefined;
  readonly '--forge-kbd-font-size-lg'?: string | undefined;
  readonly '--forge-kbd-font-size-md'?: string | undefined;
  readonly '--forge-kbd-font-size-sm'?: string | undefined;
  readonly '--forge-kbd-font-weight-medium'?: string | undefined;
};

function createKbdStyle(properties: Readonly<KbdStyleProperties> | undefined): KbdStyle | undefined {
  return createForgeStyle({
    '--forge-kbd-code-kbd-background': properties?.['code-kbd-background'],
    '--forge-kbd-code-kbd-border': properties?.['code-kbd-border'],
    '--forge-kbd-code-kbd-border-width': properties?.['code-kbd-border-width'],
    '--forge-kbd-code-kbd-padding-block': properties?.['code-kbd-padding-block'],
    '--forge-kbd-code-kbd-padding-inline': properties?.['code-kbd-padding-inline'],
    '--forge-kbd-code-kbd-pressed-offset': properties?.['code-kbd-pressed-offset'],
    '--forge-kbd-code-kbd-pressed-shadow': properties?.['code-kbd-pressed-shadow'],
    '--forge-kbd-code-kbd-radius': properties?.['code-kbd-radius'],
    '--forge-kbd-code-kbd-text': properties?.['code-kbd-text'],
    '--forge-kbd-color-border-default': properties?.['color-border-default'],
    '--forge-kbd-font-family-mono': properties?.['font-family-mono'],
    '--forge-kbd-font-size-lg': properties?.['font-size-lg'],
    '--forge-kbd-font-size-md': properties?.['font-size-md'],
    '--forge-kbd-font-size-sm': properties?.['font-size-sm'],
    '--forge-kbd-font-weight-medium': properties?.['font-weight-medium'],
  }) as KbdStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface KbdProperties {
  /** Key content rendered in the default slot. */
  children?: MpChild | readonly MpChild[];
  /** Key size. Defaults to `'md'`. */
  size?: KbdSize;
  /** Whether the key is visually pressed. */
  pressed?: boolean;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<KbdStyleProperties>;
}

/** A semantic keyboard key/chord label rendered in the neutral JSX dialect. */
export function ForgeKbd(properties: Readonly<KbdProperties>): MpElement {
  const style = createKbdStyle(properties.properties);

  const { size = 'md', pressed = false } = properties;
  const className = classNames(styles['forge-kbd'], styles[`forge-kbd--${size}`], {
    [styles['forge-kbd--pressed']]: pressed,
  });

  return (
    <kbd
      className={className}
      style={style}
    >
      {properties.children}
    </kbd>
  );
}
