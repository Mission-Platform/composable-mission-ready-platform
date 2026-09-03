import { renderEmail } from '@mission-platform/email-renderer';
import { describe, expect, it } from 'vitest';

import { EmailImage } from './email-image';

describe('EmailImage', () => {
  it('requires accessible alt text and emits dimensions', () => {
    const output = renderEmail(
      EmailImage({ src: 'https://example.com/logo.png', alt: 'Mission logo', width: 120, height: 40 }),
    );

    expect(output).toContain('alt="Mission logo"');
    expect(output).toContain('height="40"');
    expect(output).toContain('width="120"');
    expect(() => EmailImage({ src: 'https://example.com/logo.png', alt: ' ' })).toThrow('non-empty alt');
  });
});
