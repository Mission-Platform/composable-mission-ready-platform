import { type MpChild, type MpElement, useState } from '@mission-platform/forge';

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
}

export function ForgeSiteFooter(properties: Readonly<SiteFooterProperties>): MpElement {
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
    <footer className={styles['forge-site-footer']}>
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
