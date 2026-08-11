import { validateUrl } from '@mission-platform/email-renderer';
import { h, type MpElement } from '@mission-platform/forge';

export interface EmailSocialLink {
  readonly href: string;
  readonly label: string;
}

export interface EmailSocialLinksProperties {
  readonly links: readonly EmailSocialLink[];
  readonly separator?: string;
}

export function EmailSocialLinks(properties: Readonly<EmailSocialLinksProperties>): MpElement {
  const separator = properties.separator ?? ' | ';
  return (
    <p
      role="list"
      aria-label="Social links"
    >
      {properties.links.map((link, index) => (
        <span role="listitem">
          {index > 0 ? separator : undefined}
          <a href={validateUrl(link.href, 'href')}>{link.label}</a>
        </span>
      ))}
    </p>
  );
}
