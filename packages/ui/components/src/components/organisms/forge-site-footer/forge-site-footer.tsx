import {
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import styles from './forge-site-footer.module.scss';

export interface SiteFooterLink {
  label: string;
  href: string;
  external?: boolean;
}
export interface SiteFooterColumn {
  title: string;
  links: SiteFooterLink[];
}
export interface SiteFooterSocial {
  id: string;
  label: string;
  href: string;
  icon?: MpChild;
}
export interface SiteFooterNewsletter {
  title?: string;
  description?: string;
  placeholder?: string;
  submitLabel?: string;
  buttonLabel?: string;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface SiteFooterStyleProperties {
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-inverse'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-text-on-inverse'?: string;
  readonly 'color-text-on-primary'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'font-size-xl'?: string;
  readonly 'font-weight-bold'?: string;
  readonly 'line-height-relaxed'?: string;
  readonly 'radius-md'?: string;
  readonly 'size-height-lg'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-10'?: string;
  readonly 'spacing-12'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-5'?: string;
  readonly 'spacing-6'?: string;
  readonly 'spacing-8'?: string;
}

export type SiteFooterStyle = CSSStyleProperties & {
  readonly '--forge-site-footer-border-width-thin'?: string | undefined;
  readonly '--forge-site-footer-color-bg-inverse'?: string | undefined;
  readonly '--forge-site-footer-color-primary-default'?: string | undefined;
  readonly '--forge-site-footer-color-text-on-inverse'?: string | undefined;
  readonly '--forge-site-footer-color-text-on-primary'?: string | undefined;
  readonly '--forge-site-footer-font-size-sm'?: string | undefined;
  readonly '--forge-site-footer-font-size-xl'?: string | undefined;
  readonly '--forge-site-footer-font-weight-bold'?: string | undefined;
  readonly '--forge-site-footer-line-height-relaxed'?: string | undefined;
  readonly '--forge-site-footer-radius-md'?: string | undefined;
  readonly '--forge-site-footer-size-height-lg'?: string | undefined;
  readonly '--forge-site-footer-spacing-1'?: string | undefined;
  readonly '--forge-site-footer-spacing-10'?: string | undefined;
  readonly '--forge-site-footer-spacing-12'?: string | undefined;
  readonly '--forge-site-footer-spacing-2'?: string | undefined;
  readonly '--forge-site-footer-spacing-3'?: string | undefined;
  readonly '--forge-site-footer-spacing-4'?: string | undefined;
  readonly '--forge-site-footer-spacing-5'?: string | undefined;
  readonly '--forge-site-footer-spacing-6'?: string | undefined;
  readonly '--forge-site-footer-spacing-8'?: string | undefined;
};

function createSiteFooterStyle(
  properties: Readonly<SiteFooterStyleProperties> | undefined,
): SiteFooterStyle | undefined {
  return createForgeStyle({
    '--forge-site-footer-border-width-thin': properties?.['border-width-thin'],
    '--forge-site-footer-color-bg-inverse': properties?.['color-bg-inverse'],
    '--forge-site-footer-color-primary-default': properties?.['color-primary-default'],
    '--forge-site-footer-color-text-on-inverse': properties?.['color-text-on-inverse'],
    '--forge-site-footer-color-text-on-primary': properties?.['color-text-on-primary'],
    '--forge-site-footer-font-size-sm': properties?.['font-size-sm'],
    '--forge-site-footer-font-size-xl': properties?.['font-size-xl'],
    '--forge-site-footer-font-weight-bold': properties?.['font-weight-bold'],
    '--forge-site-footer-line-height-relaxed': properties?.['line-height-relaxed'],
    '--forge-site-footer-radius-md': properties?.['radius-md'],
    '--forge-site-footer-size-height-lg': properties?.['size-height-lg'],
    '--forge-site-footer-spacing-1': properties?.['spacing-1'],
    '--forge-site-footer-spacing-10': properties?.['spacing-10'],
    '--forge-site-footer-spacing-12': properties?.['spacing-12'],
    '--forge-site-footer-spacing-2': properties?.['spacing-2'],
    '--forge-site-footer-spacing-3': properties?.['spacing-3'],
    '--forge-site-footer-spacing-4': properties?.['spacing-4'],
    '--forge-site-footer-spacing-5': properties?.['spacing-5'],
    '--forge-site-footer-spacing-6': properties?.['spacing-6'],
    '--forge-site-footer-spacing-8': properties?.['spacing-8'],
  }) as SiteFooterStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface SiteFooterProperties {
  logo?: string | MpChild;
  brandHref?: string;
  description?: string;
  columns?: SiteFooterColumn[];
  socials?: SiteFooterSocial[];
  socialLinks?: SiteFooterSocial[];
  newsletter?: SiteFooterNewsletter | boolean;
  onNewsletterSubmit?: (email: string) => void;
  onSubscribe?: (email: string) => void;
  copyright?: string;
  children?: MpChild | readonly MpChild[];

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<SiteFooterStyleProperties>;
}

export function ForgeSiteFooter(properties: Readonly<SiteFooterProperties>): MpElement {
  const style = createSiteFooterStyle(properties.properties);

  const { logo, brandHref = '/', description, columns = [], copyright, children } = properties;
  const socials = properties.socials ?? [];
  const newsletter: SiteFooterNewsletter | undefined =
    properties.newsletter === true ? {} : typeof properties.newsletter === 'object' ? properties.newsletter : undefined;
  const [email, setEmail] = useState('');
  const submitNewsletter = (event: Event): void => {
    event.preventDefault();
    const value = email.trim();
    if (!value) return;
    properties.onNewsletterSubmit?.(value);
    properties.onSubscribe?.(value);
    setEmail('');
  };

  return (
    <footer
      className={styles['forge-site-footer']}
      style={style}
    >
      <div className={styles['forge-site-footer__main']}>
        <div className={styles['forge-site-footer__brand']}>
          {logo ? <a href={brandHref}>{logo}</a> : undefined}
          {description ? <p>{description}</p> : undefined}
          {children}
        </div>
        <div className={styles['forge-site-footer__columns']}>
          {columns.map((column) => (
            <section
              key={column.title}
              aria-label={column.title}
            >
              <h2>{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noreferrer' : undefined}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      {socials.length > 0 ? (
        <nav
          className={styles['forge-site-footer__socials']}
          aria-label="Social links"
        >
          <h2>Follow us</h2>
          <ul>
            {socials.map((social) => (
              <li key={social.href}>
                <a
                  href={social.href}
                  target={social.href.startsWith('http') ? '_blank' : undefined}
                  rel={social.href.startsWith('http') ? 'noreferrer' : undefined}
                >
                  {social.icon}
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : undefined}
      {newsletter ? (
        <form
          className={styles['forge-site-footer__newsletter']}
          onSubmit={submitNewsletter}
        >
          <div>
            <h2>{newsletter.title ?? 'Stay in the loop'}</h2>
            {newsletter.description ? <p>{newsletter.description}</p> : undefined}
          </div>
          <label>
            <span className={styles['forge-site-footer__visually-hidden']}>Email address</span>
            <input
              type="email"
              required
              placeholder={newsletter.placeholder ?? 'Email address'}
              value={email}
              onInput={(event: Event) => setEmail((event.target as HTMLInputElement).value)}
            />
          </label>
          <button type="submit">{newsletter.submitLabel ?? newsletter.buttonLabel ?? 'Subscribe'}</button>
        </form>
      ) : undefined}
      {copyright ? (
        <div className={styles['forge-site-footer__bottom']}>
          <span>{copyright}</span>
        </div>
      ) : undefined}
    </footer>
  );
}
