import { classNames, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge';

import { initialsForName } from '../../../utils';
import { ForgeAvatar } from '../../atoms/forge-avatar';
import { ForgeSkeleton } from '../../atoms/forge-skeleton';

import styles from './forge-profile-card.module.scss';

export interface ProfileSocial {
  id: string;
  label: string;
  href: string;
}
export interface ProfileUser {
  name: string;
  role?: string;
  bio?: string;
  src?: string;
  avatar?: string;
  initials?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  location?: string;
  socials?: ProfileSocial[];
}
export interface ProfileStat {
  id?: string;
  label: string;
  value: string | number;
}
export type ProfileCardVariant = 'default' | 'compact' | 'detailed';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ProfileCardStyleProperties {
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-muted'?: string;
  readonly 'color-bg-surface'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-text-link'?: string;
  readonly 'color-text-on-primary'?: string;
  readonly 'color-text-tertiary'?: string;
  readonly 'font-size-xl'?: string;
  readonly 'font-size-xs'?: string;
  readonly 'font-weight-bold'?: string;
  readonly 'line-height-relaxed'?: string;
  readonly 'radius-lg'?: string;
  readonly 'radius-md'?: string;
  readonly 'size-height-lg'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-5'?: string;
}

export type ProfileCardStyle = CSSStyleProperties & {
  readonly '--forge-profile-card-border-width-thin'?: string | undefined;
  readonly '--forge-profile-card-color-bg-muted'?: string | undefined;
  readonly '--forge-profile-card-color-bg-surface'?: string | undefined;
  readonly '--forge-profile-card-color-border-default'?: string | undefined;
  readonly '--forge-profile-card-color-primary-default'?: string | undefined;
  readonly '--forge-profile-card-color-text-link'?: string | undefined;
  readonly '--forge-profile-card-color-text-on-primary'?: string | undefined;
  readonly '--forge-profile-card-color-text-tertiary'?: string | undefined;
  readonly '--forge-profile-card-font-size-xl'?: string | undefined;
  readonly '--forge-profile-card-font-size-xs'?: string | undefined;
  readonly '--forge-profile-card-font-weight-bold'?: string | undefined;
  readonly '--forge-profile-card-line-height-relaxed'?: string | undefined;
  readonly '--forge-profile-card-radius-lg'?: string | undefined;
  readonly '--forge-profile-card-radius-md'?: string | undefined;
  readonly '--forge-profile-card-size-height-lg'?: string | undefined;
  readonly '--forge-profile-card-spacing-1'?: string | undefined;
  readonly '--forge-profile-card-spacing-2'?: string | undefined;
  readonly '--forge-profile-card-spacing-3'?: string | undefined;
  readonly '--forge-profile-card-spacing-4'?: string | undefined;
  readonly '--forge-profile-card-spacing-5'?: string | undefined;
};

function createProfileCardStyle(
  properties: Readonly<ProfileCardStyleProperties> | undefined,
): ProfileCardStyle | undefined {
  return createForgeStyle({
    '--forge-profile-card-border-width-thin': properties?.['border-width-thin'],
    '--forge-profile-card-color-bg-muted': properties?.['color-bg-muted'],
    '--forge-profile-card-color-bg-surface': properties?.['color-bg-surface'],
    '--forge-profile-card-color-border-default': properties?.['color-border-default'],
    '--forge-profile-card-color-primary-default': properties?.['color-primary-default'],
    '--forge-profile-card-color-text-link': properties?.['color-text-link'],
    '--forge-profile-card-color-text-on-primary': properties?.['color-text-on-primary'],
    '--forge-profile-card-color-text-tertiary': properties?.['color-text-tertiary'],
    '--forge-profile-card-font-size-xl': properties?.['font-size-xl'],
    '--forge-profile-card-font-size-xs': properties?.['font-size-xs'],
    '--forge-profile-card-font-weight-bold': properties?.['font-weight-bold'],
    '--forge-profile-card-line-height-relaxed': properties?.['line-height-relaxed'],
    '--forge-profile-card-radius-lg': properties?.['radius-lg'],
    '--forge-profile-card-radius-md': properties?.['radius-md'],
    '--forge-profile-card-size-height-lg': properties?.['size-height-lg'],
    '--forge-profile-card-spacing-1': properties?.['spacing-1'],
    '--forge-profile-card-spacing-2': properties?.['spacing-2'],
    '--forge-profile-card-spacing-3': properties?.['spacing-3'],
    '--forge-profile-card-spacing-4': properties?.['spacing-4'],
    '--forge-profile-card-spacing-5': properties?.['spacing-5'],
  }) as ProfileCardStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ProfileCardProperties {
  user: ProfileUser;
  variant?: ProfileCardVariant;
  editable?: boolean;
  loading?: boolean;
  stats?: ProfileStat[];
  onEdit?: () => void;
  onSocialClick?: (social: ProfileSocial) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ProfileCardStyleProperties>;
}

export function ForgeProfileCard(properties: Readonly<ProfileCardProperties>): MpElement {
  const style = createProfileCardStyle(properties.properties);

  const user = properties.user;
  const { variant = 'default', editable = false, loading = false } = properties;
  if (loading)
    return (
      <article
        className={classNames(styles['forge-profile-card'], styles['forge-profile-card--loading'])}
        aria-busy="true"
        style={style}
      >
        <ForgeSkeleton
          shape="circle"
          size="xl"
        />
        <ForgeSkeleton width="10rem" />
        <ForgeSkeleton width="16rem" />
      </article>
    );
  const src = user.src ?? user.avatar;
  return (
    <article
      className={classNames(styles['forge-profile-card'], styles[`forge-profile-card--${variant}`])}
      style={style}
    >
      <div className={styles['forge-profile-card__identity']}>
        <ForgeAvatar
          src={src}
          alt={user.name}
          initials={user.initials ?? initialsForName(user.name)}
          size="xl"
          status={user.status}
        />
        <div>
          <h2>{user.name}</h2>
          {user.role ? <p>{user.role}</p> : undefined}
          {user.location ? <small>{user.location}</small> : undefined}
        </div>
      </div>
      {user.bio ? <p className={styles['forge-profile-card__bio']}>{user.bio}</p> : undefined}
      {user.socials && user.socials.length > 0 ? (
        <nav
          className={styles['forge-profile-card__socials']}
          aria-label={`${user.name} social links`}
        >
          <ul>
            {user.socials.map((social) => (
              <li key={social.id}>
                <a
                  href={social.href}
                  onClick={() => properties.onSocialClick?.(social)}
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : undefined}
      {properties.stats && properties.stats.length > 0 ? (
        <dl className={styles['forge-profile-card__stats']}>
          {properties.stats.map((stat, index) => (
            <div key={stat.id ?? `${stat.label}-${index}`}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : undefined}
      {editable ? (
        <button
          type="button"
          aria-label="Edit profile"
          onClick={() => properties.onEdit?.()}
        >
          Edit profile
        </button>
      ) : undefined}
    </article>
  );
}
