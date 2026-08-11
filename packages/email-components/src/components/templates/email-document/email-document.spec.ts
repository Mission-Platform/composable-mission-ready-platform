import { renderEmail } from '@mission-platform/email-renderer';
import { describe, expect, it } from 'vitest';

import { assertCompatibleEmailHtml } from '@/compatibility';
import { EmailButton, EmailTypography } from '@/components/atoms';

import { EmailContainer, EmailDocument, EmailSection } from '..';

describe('email templates', () => {
  it('renders a complete nested document using static table fallbacks', () => {
    const node = EmailDocument({
      previewText: 'A preview',
      children: EmailContainer({
        children: EmailSection({
          children: [
            EmailTypography({ as: 'h2', children: 'Welcome' }),
            EmailTypography({ children: 'Body copy' }),
            EmailButton({ href: 'https://example.com', children: 'Read more' }),
          ],
        }),
      }),
    });
    const output = renderEmail(node, { title: 'Welcome', responsive: true });

    expect(output).toContain('<!doctype html>');
    expect(output).toContain('<title>Welcome</title>');
    expect(output).toContain('A preview');
    expect(output).toContain('mp-email-container');
    expect(output).toContain('@media only screen');
    expect(output).not.toContain('var(--');
    assertCompatibleEmailHtml(output);
  });
});
