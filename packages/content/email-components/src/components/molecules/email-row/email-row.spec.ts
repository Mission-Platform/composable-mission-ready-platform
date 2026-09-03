import { renderEmail } from '@mission-platform/email-renderer';
import { describe, expect, it } from 'vitest';

import { EmailCard, EmailColumn, EmailList, EmailRow } from '..';
import { assertCompatibleEmailHtml } from '../../../compatibility';

describe('email layout molecules', () => {
  it('composes table rows, columns, cards, and lists', () => {
    const node = EmailRow({
      stackOnMobile: true,
      children: [
        EmailColumn({ width: '50%', children: EmailCard({ children: 'Card content' }) }),
        EmailColumn({
          width: '50%',
          children: EmailList({ items: [{ children: 'First item', href: 'https://example.com' }] }),
        }),
      ],
    });
    const output = renderEmail(node);

    expect(output).toContain('class="mp-email-stack"');
    expect(output).toContain('Card content');
    expect(output).toContain('First item');
    expect(output).toContain('border-collapse: collapse');
    expect(output).not.toContain('display:flex');
    expect(output).not.toContain('display:grid');
    assertCompatibleEmailHtml(output);
  });
});
