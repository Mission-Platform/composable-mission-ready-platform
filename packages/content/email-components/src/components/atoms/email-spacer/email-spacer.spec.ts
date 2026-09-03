import { renderEmail } from '@mission-platform/email-renderer';
import { describe, expect, it } from 'vitest';

import { EmailSpacer } from './email-spacer';

describe('EmailSpacer', () => {
  it('uses an explicit fixed-height table cell', () => {
    const output = renderEmail(EmailSpacer({ spacing: 'lg' }));

    expect(output).toContain('height="24px"');
    expect(output).toContain('height: 24px; height: 1.714rem');
    expect(output).toContain('line-height: 0');
  });
});
