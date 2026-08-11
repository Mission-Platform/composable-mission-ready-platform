import { renderEmail } from '@mission-platform/email-renderer';
import { describe, expect, it } from 'vitest';

import { assertCompatibleEmailHtml } from '../../../compatibility';

import { EmailButton } from './email-button';

describe('EmailButton', () => {
  it('uses a table CTA with a usable anchor fallback', () => {
    const output = renderEmail(EmailButton({ href: 'https://example.com', children: 'Continue' }));

    assertCompatibleEmailHtml(output);
    expect(output).toContain('<table');
    expect(output).toContain('<a');
    expect(output).toContain('>Continue</a>');
    expect(output).not.toContain('display:flex');
  });

  it('supports Forge variants and size tokens with literal fallbacks', () => {
    const output = renderEmail(
      EmailButton({ href: 'https://example.com', size: '2xl', variant: 'success', children: 'Get started' }),
    );

    expect(output).toContain('background-color: #287a55; oklab');
    expect(output).toContain('padding: 16px; 1.143rem 24px; 1.714rem');
    expect(output).toContain('font-size: 24px; 1.714rem');
    expect(output).toContain('>Get started</a>');
    assertCompatibleEmailHtml(output);
  });

  it('keeps secondary buttons visibly outlined', () => {
    const output = renderEmail(EmailButton({ href: 'https://example.com', variant: 'secondary' }));

    expect(output).toContain('border: 1px; 0.071rem solid');
    expect(output).toContain('background-color: #ffffff; oklab');
  });

  it.each(['tertiary', 'ghost'] as const)('matches ForgeButton typography and transparent %s treatment', (variant) => {
    const output = renderEmail(EmailButton({ href: 'https://example.com', variant }));

    expect(output).toContain('line-height: 1.3');
    expect(output).toContain('background-color: transparent');
    expect(output).not.toContain('background-color: #ffffff; oklab');
  });
});
