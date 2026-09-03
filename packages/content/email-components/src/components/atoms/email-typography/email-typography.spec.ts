import { renderEmail } from '@mission-platform/email-renderer';
import { describe, expect, it } from 'vitest';

import { assertCompatibleEmailHtml } from '../../../compatibility';

import { EmailTypography } from './email-typography';

const HEADING_SCALES = [
  { as: 'h1', fontSize: '2.25rem', fontWeight: 600 },
  { as: 'h2', fontSize: '1.875rem', fontWeight: 600 },
  { as: 'h3', fontSize: '1.5rem', fontWeight: 500 },
  { as: 'h4', fontSize: undefined, fontWeight: 500 },
  { as: 'h5', fontSize: undefined, fontWeight: 500 },
  { as: 'h6', fontSize: undefined, fontWeight: 500 },
] as const;

describe('EmailTypography', () => {
  it.each(HEADING_SCALES)('renders $as with its own type scale', ({ as, fontSize, fontWeight }) => {
    const output = renderEmail(EmailTypography({ as, children: 'Title' }));

    expect(output).toContain(`<${as} `);
    expect(output).toContain(`</${as}>`);
    if (fontSize === undefined) {
      expect(output).not.toContain('font-size:');
    } else {
      expect(output).toContain(`font-size: ${fontSize}`);
    }
    expect(output).toContain(`font-weight: ${fontWeight}`);
    assertCompatibleEmailHtml(output);
  });

  it('renders tokenized body text and escapes content', () => {
    const output = renderEmail(EmailTypography({ children: 'Hello <world>' }));

    expect(output).toContain('<p style="color: #211f22; color: oklab');
    expect(output).toContain('Hello &lt;world&gt;');
    assertCompatibleEmailHtml(output);
  });

  it('applies an explicit alignment and color', () => {
    const output = renderEmail(
      EmailTypography({ align: 'center', color: 'text.secondary', children: 'Centered copy' }),
    );

    expect(output).toContain('align="center"');
    expect(output).toContain('color: #514d52; color: oklab');
  });

  it('protects external links opened in a new context', () => {
    const output = renderEmail(
      EmailTypography({ href: 'https://example.com', target: '_blank', children: 'Announcement' }),
    );

    expect(output).toContain('<a ');
    expect(output).toContain('rel="noopener noreferrer"');
    expect(output).toContain('target="_blank"');
    expect(output).toContain('text-decoration: underline');
    expect(output).toContain('>Announcement</a>');
    assertCompatibleEmailHtml(output);
  });

  it('falls back to the href as the readable link label', () => {
    const output = renderEmail(EmailTypography({ href: 'https://example.com' }));

    expect(output).toContain('>https://example.com</a>');
    expect(output).toContain('font-family:');
    expect(output).not.toContain('rel=');
    assertCompatibleEmailHtml(output);
  });

  it('keeps a heading scale when the heading is a link', () => {
    const output = renderEmail(EmailTypography({ as: 'h3', href: 'https://example.com', children: 'Linked' }));

    expect(output).toContain('<h3 ');
    expect(output).toContain('font-size: 1.5rem');
    expect(output).toContain('href="https://example.com"');
  });

  it('rejects unsafe URLs instead of emitting an anchor', () => {
    expect(() => EmailTypography({ href: 'javascript:alert(1)' })).toThrow('forbidden URL scheme');
    expect(() => EmailTypography({ href: '   ' })).toThrow('must not be empty');
  });
});
