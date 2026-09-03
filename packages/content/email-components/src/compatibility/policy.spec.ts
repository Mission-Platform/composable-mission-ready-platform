import { renderEmail } from '@mission-platform/email-renderer';
import { describe, expect, it } from 'vitest';

import { EmailButton } from '../components/atoms';

import { assertCompatibleEmailHtml, CAN_I_EMAIL_FEATURES_URL } from './policy';

describe('email compatibility policy', () => {
  it('accepts generated conservative markup and rejects modern/runtime output', () => {
    expect(CAN_I_EMAIL_FEATURES_URL).toBe('https://www.caniemail.com/features');
    expect(() =>
      assertCompatibleEmailHtml(renderEmail(EmailButton({ href: 'https://example.com', children: 'Go' }))),
    ).not.toThrow();
    expect(() => assertCompatibleEmailHtml('<div style="display: grid">bad</div>')).toThrow('forbidden pattern');
  });
});
