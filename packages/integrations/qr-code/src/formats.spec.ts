import { describe, expect, it } from 'vitest';

import { email, geo, iCalEvent, meCard, phone, sms, url, vCard, wifi } from './formats';
import { decodeQr, encodeQr } from './index';

/**
 * Exercises the ready-made payload builders: the exact wire format each scheme
 * produces, escaping of structural characters, optional-field handling, and a
 * round-trip through the real encoder/decoder to prove the strings survive a
 * QR Code intact.
 */
describe('format builders', () => {
  describe('url', () => {
    it('returns the value verbatim', () => {
      expect(url('https://mission-platform.dev')).toBe('https://mission-platform.dev');
    });
  });

  describe('wifi', () => {
    it('builds a WPA payload with a password', () => {
      expect(wifi({ ssid: 'Cafe', password: 'latte123', encryption: 'WPA' })).toBe('WIFI:T:WPA;S:Cafe;P:latte123;;');
    });

    it('defaults the encryption to WPA', () => {
      expect(wifi({ ssid: 'Cafe', password: 'pw' })).toBe('WIFI:T:WPA;S:Cafe;P:pw;;');
    });

    it('omits the password for an open network and marks a hidden SSID', () => {
      expect(wifi({ ssid: 'Guest', encryption: 'nopass', hidden: true })).toBe('WIFI:T:nopass;S:Guest;H:true;;');
    });

    it('escapes structural characters in the SSID and password', () => {
      expect(wifi({ ssid: 'My;Net', password: 'a,b:c"d\\e' })).toBe('WIFI:T:WPA;S:My\\;Net;P:a\\,b\\:c\\"d\\\\e;;');
    });
  });

  describe('email', () => {
    it('builds a bare mailto', () => {
      expect(email({ to: 'hi@example.com' })).toBe('mailto:hi@example.com');
    });

    it('encodes subject and body as query parameters', () => {
      expect(email({ to: 'hi@example.com', subject: 'Hi there', body: 'a & b' })).toBe(
        'mailto:hi@example.com?subject=Hi%20there&body=a%20%26%20b',
      );
    });
  });

  describe('sms', () => {
    it('builds an SMSTO payload with and without a message', () => {
      expect(sms({ number: '+14155550123' })).toBe('SMSTO:+14155550123');
      expect(sms({ number: '+14155550123', message: 'hello' })).toBe('SMSTO:+14155550123:hello');
    });
  });

  describe('phone', () => {
    it('builds a tel payload', () => {
      expect(phone('+14155550123')).toBe('tel:+14155550123');
    });
  });

  describe('geo', () => {
    it('builds a geo payload, optionally with altitude', () => {
      expect(geo({ latitude: 37.422, longitude: -122.084 })).toBe('geo:37.422,-122.084');
      expect(geo({ latitude: 37.422, longitude: -122.084, altitude: 12 })).toBe('geo:37.422,-122.084,12');
    });
  });

  describe('vCard', () => {
    it('builds a vCard with derived FN and repeated TEL/EMAIL lines', () => {
      const result = vCard({
        firstName: 'Ada',
        lastName: 'Lovelace',
        organization: 'Analytical Engines',
        title: 'Mathematician',
        phone: ['+100', '+200'],
        email: 'ada@example.com',
        url: 'https://example.com',
      });
      expect(result).toBe(
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
  });

  describe('meCard', () => {
    it('builds a MeCard with escaped fields', () => {
      expect(meCard({ firstName: 'Ada', lastName: 'Lovelace', phone: '+100', email: 'ada@example.com' })).toBe(
        'MECARD:N:Lovelace,Ada;TEL:+100;EMAIL:ada@example.com;;',
      );
    });
  });

  describe('iCalEvent', () => {
    it('builds a timed VEVENT in UTC', () => {
      const result = iCalEvent({
        title: 'Launch',
        start: new Date('2026-07-14T09:00:00Z'),
        end: new Date('2026-07-14T10:30:00Z'),
        location: 'HQ',
      });
      expect(result).toBe(
        [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'BEGIN:VEVENT',
          'SUMMARY:Launch',
          'DTSTART:20260714T090000Z',
          'DTEND:20260714T103000Z',
          'LOCATION:HQ',
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\n'),
      );
    });

    it('builds an all-day VEVENT with date-only stamps and escapes text', () => {
      const result = iCalEvent({
        title: 'Party, big',
        start: new Date('2026-07-14T00:00:00Z'),
        allDay: true,
      });
      expect(result).toContain('DTSTART;VALUE=DATE:20260714');
      expect(result).toContain('SUMMARY:Party\\, big');
    });
  });

  it('produces payloads that survive an encode/decode round-trip', () => {
    const payloads = [
      url('https://mission-platform.dev'),
      wifi({ ssid: 'Cafe', password: 'latte123' }),
      email({ to: 'hi@example.com', subject: 'Hi' }),
      sms({ number: '+100', message: 'hello' }),
      phone('+100'),
      geo({ latitude: 1.5, longitude: -2.5 }),
      meCard({ firstName: 'Ada', lastName: 'Lovelace', phone: '+100' }),
    ];
    for (const payload of payloads) {
      expect(decodeQr(encodeQr(payload, 'M'))).toBe(payload);
    }
  });
});
