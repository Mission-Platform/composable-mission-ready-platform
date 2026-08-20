import { h, type MpChild, type MpElement } from '@mission-platform/forge';

/** Canonical 2xs → 2xl size scale shared across the display components. */
export type AvatarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Avatar outline shape. */
export type AvatarShape = 'circle' | 'square';
/** Optional presence indicator rendered as a corner dot. */
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy' | undefined;
/** Colour tone of the initials/slot fallback fill — the canonical colour set. */
export type AvatarVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

export interface AvatarProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Image source. When set, the image is shown in preference to `initials`/slot. */
  src?: string;
  /** Alternative text for the image. */
  alt?: string;
  /** Fallback initials shown when there is no `src`. */
  initials?: string;
  /** Size token. Defaults to `'md'`. */
  size?: AvatarSize;
  /** Outline shape. Defaults to `'circle'`. */
  shape?: AvatarShape;
  /** Presence indicator. When set, a coloured corner dot is shown. */
  status?: AvatarStatus;
  /** Colour tone of the initials/slot fallback fill. Defaults to `'primary'`. Overridden by `color`. */
  variant?: AvatarVariant;
  /** Background colour used for the initials/slot fallback (when there is no `src`). Overrides `variant`. */
  color?: string;
}

/** Maps each {@link AvatarSize} onto its pixel dimension. */
const SIZE_MAP: Record<AvatarSize, string> = {
  '2xs': '20px',
  xs: '24px',
  sm: '32px',
  md: '40px',
  lg: '56px',
  xl: '80px',
  '2xl': '96px',
};

/** Maps each {@link AvatarSize} onto its `--mp-size-font-*` token. */
const FONT_SIZE_MAP: Record<AvatarSize, string> = {
  '2xs': 'var(--mp-size-font-2xs)',
  xs: 'var(--mp-size-font-xs)',
  sm: 'var(--mp-size-font-sm)',
  md: 'var(--mp-size-font-md)',
  lg: 'var(--mp-size-font-lg)',
  xl: 'var(--mp-size-font-xl)',
  '2xl': 'var(--mp-size-font-2xl)',
};

/** Maps each {@link AvatarSize} onto the presence-dot diameter. */
const STATUS_SIZE_MAP: Record<AvatarSize, string> = {
  '2xs': '5px',
  xs: '6px',
  sm: '8px',
  md: '10px',
  lg: '13px',
  xl: '18px',
  '2xl': '22px',
};

/** Maps each presence state onto its indicator colour token. */
const STATUS_COLOR_MAP: Record<NonNullable<AvatarStatus>, string> = {
  online: 'var(--mp-component-media-avatar-status-online)',
  offline: 'var(--mp-component-media-avatar-status-offline)',
  away: 'var(--mp-component-media-avatar-status-away)',
  busy: 'var(--mp-component-media-avatar-status-busy)',
};

/**
 * Maps each {@link AvatarVariant} onto its fallback fill colour. The `neutral`
 * tone reuses the `default` token family (no `neutral` alias).
 */
const VARIANT_COLOR_MAP: Record<AvatarVariant, string> = {
  neutral: 'var(--mp-component-media-avatar-surface-neutral)',
  primary: 'var(--mp-component-media-avatar-surface-primary)',
  secondary: 'var(--mp-component-media-avatar-surface-secondary)',
  tertiary: 'var(--mp-component-media-avatar-surface-tertiary)',
  success: 'var(--mp-component-media-avatar-surface-success)',
  warning: 'var(--mp-component-media-avatar-surface-warning)',
  info: 'var(--mp-component-media-avatar-surface-info)',
  error: 'var(--mp-component-media-avatar-surface-error)',
  critical: 'var(--mp-component-media-avatar-surface-critical)',
};

/**
 * `ForgeAvatar` — a user/entity avatar authored once in the neutral JSX dialect
 * and compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * It shows (in priority order) an `src` image, fallback `initials`, or the
 * default slot, sized by the canonical `2xs … 2xl` scale, optionally with a
 * presence-status corner dot. Like the migrated layout primitives it lays
 * itself out with **inline styles** (driven by design tokens), so it ships no
 * CSS Module of its own; the co-located `forge-avatar.module.scss` only dresses
 * the Storybook demo content.
 */
export function ForgeAvatar(properties: Readonly<AvatarProperties>): MpElement {
  const { src, alt = '', initials, size = 'md', shape = 'circle', status, variant = 'primary', color } = properties;

  const dimension = SIZE_MAP[size];
  const statusColor = status ? STATUS_COLOR_MAP[status] : undefined;

  const avatarStyle: Record<string, string | undefined> = {
    width: dimension,
    height: dimension,
    borderRadius:
      shape === 'circle' ? 'var(--mp-component-media-avatar-radius-circle)' : 'var(--mp-component-media-avatar-radius-square)',
    backgroundColor: src ? undefined : (color ?? VARIANT_COLOR_MAP[variant]),
    fontSize: FONT_SIZE_MAP[size],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: '0',
    color: 'var(--mp-component-media-avatar-text-default)',
    fontWeight: 'var(--mp-font-weight-semibold)',
    fontFamily: 'var(--mp-font-family-sans)',
    userSelect: 'none',
  };

  const inner = src ? (
    <img
      class="avatar__image-img"
      src={src}
      alt={alt}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  ) : initials ? (
    <span class="avatar__initials">{initials}</span>
  ) : (
    properties.children
  );

  return (
    <div
      class="avatar"
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      <div
        className={['avatar__image', `avatar--${size}`, `avatar--${shape}`].join(' ')}
        style={avatarStyle}
      >
        {inner}
      </div>
      {status ? (
        <span
          class="avatar__status"
          role="status"
          aria-label={status}
          aria-atomic="false"
          aria-live="off"
          style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: STATUS_SIZE_MAP[size],
            height: STATUS_SIZE_MAP[size],
            borderRadius: 'var(--mp-component-media-avatar-radius-status)',
            backgroundColor: statusColor,
            border: '2px solid var(--mp-component-media-avatar-border-status)',
            display: 'block',
          }}
        />
      ) : undefined}
    </div>
  );
}
