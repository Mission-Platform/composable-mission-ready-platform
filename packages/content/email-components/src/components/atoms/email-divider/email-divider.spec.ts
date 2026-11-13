import { describe, expect, it } from 'vitest';

import { renderEmail } from '@mission-platform/email-renderer';

import { EmailDivider } from './email-divider';

describe('EmailDivider', () => {
  it('uses a table-cell border rule', () => {
    const output = renderEmail(EmailDivider({}));

    expect(output).toContain('<td style="border-top:');
    expect(output).not.toContain('<hr');
  });
});
