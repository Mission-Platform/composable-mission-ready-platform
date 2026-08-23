import { renderEmail } from '@mission-platform/email-renderer';
import { describe, expect, it } from 'vitest';

import { EmailFooter, EmailHeader, EmailPreheader } from '..';
import { assertCompatibleEmailHtml } from '../../../compatibility';

describe('email organisms', () => {
  it('renders accessible branded sections and hidden preview text', () => {
    const output = renderEmail(
      EmailHeader({ brandName: 'Mission Platform', children: EmailFooter({ text: 'Unsubscribe' }) }),
    );
    const preheader = renderEmail(EmailPreheader({ text: 'Preview text' }));

    expect(output).toContain('Mission Platform');
    expect(output).toContain('Unsubscribe');
    expect(output).toContain('background-color: #ffffff; background-color: oklab');
    assertCompatibleEmailHtml(output);
    expect(preheader).toContain('mso-hide: all');
  });
});
