import { describe, expect, it } from 'vitest';

import { parseVCard, toVCardOptions, vCard, writeVCards } from '../ast/vcard';

describe('vCard', () => {
  it('builds a vCard with derived FN and repeated TEL/EMAIL lines', () => {
    expect(
      vCard({
        firstName: 'Ada',
        lastName: 'Lovelace',
        organization: 'Analytical Engines',
        title: 'Mathematician',
        phone: ['+100', '+200'],
        email: 'ada@example.com',
        url: 'https://example.com',
      }),
    ).toBe(
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'N:Lovelace;Ada;;;',
        'FN:Ada Lovelace',
        'ORG:Analytical Engines',
        'TITLE:Mathematician',
        'TEL:+100',
        'TEL:+200',
        'EMAIL:ada@example.com',
        'URL:https://example.com',
        'END:VCARD',
      ].join('\n'),
    );
  });

  it('reads, preserves, and writes complete cards including unknown properties', () => {
    const cards = parseVCard(
      'BEGIN:VCARD\r\nVERSION:4.0\r\nFN:Ada Lovelace\r\nTEL;TYPE=work:+100\r\nX-CUSTOM:hello\\,world\r\nEND:VCARD\r\n',
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual({
      version: '4.0',
      properties: [
        { name: 'FN', parameters: {}, value: 'Ada Lovelace' },
        { name: 'TEL', parameters: { TYPE: 'work' }, value: '+100' },
        { name: 'X-CUSTOM', parameters: {}, value: 'hello,world' },
      ],
    });
    expect(writeVCards(cards)).toBe(
      'BEGIN:VCARD\nVERSION:4.0\nFN:Ada Lovelace\nTEL;TYPE=work:+100\nX-CUSTOM:hello\\,world\nEND:VCARD',
    );
  });

  it('maps parsed standard properties back to convenience options', () => {
    const [card] = parseVCard(
      vCard({
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: ['+100', '+200'],
        email: 'ada@example.com',
        address: 'London',
      }),
    );

    expect(toVCardOptions(card)).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      formattedName: 'Ada Lovelace',
      organization: undefined,
      title: undefined,
      phone: ['+100', '+200'],
      email: 'ada@example.com',
      url: undefined,
      address: 'London',
      note: undefined,
    });
  });
});
