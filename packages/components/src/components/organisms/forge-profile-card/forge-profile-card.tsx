import { classNames, type MpElement } from '@mission-platform/forge';

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
export interface ProfileCardProperties {
  user: ProfileUser;
  variant?: ProfileCardVariant;
  editable?: boolean;
  loading?: boolean;
  stats?: ProfileStat[];
  onEdit?: () => void;
  onSocialClick?: (social: ProfileSocial) => void;
}

export function ForgeProfileCard(properties: Readonly<ProfileCardProperties>): MpElement {
  const user = properties.user;
  const { variant = 'default', editable = false, loading = false } = properties;
  if (loading)
    return (
      <article
        className={classNames(styles['forge-profile-card'], styles['forge-profile-card--loading'])}
        aria-busy="true"
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
    <article className={classNames(styles['forge-profile-card'], styles[`forge-profile-card--${variant}`])}>
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
