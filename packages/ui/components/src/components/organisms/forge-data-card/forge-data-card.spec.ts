import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeDataCard } from './forge-data-card';

import type { DataCardData, ICalendarData, VCardData } from './forge-data-card';

const ReactDataCard = toReactComponent(ForgeDataCard, 'DataCard');
const VueDataCard = toVueComponent(ForgeDataCard, 'DataCard');

function assertDownloaded(value: Blob | undefined): asserts value is Blob {
  if (value === undefined) throw new Error('Expected a downloaded Blob.');
}

const data: DataCardData = {
  type: 'vcard',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
};

describe('ForgeDataCard authors the same component for React and Vue', () => {
  it('renders typed contact data and download semantics on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactDataCard, { data, downloadable: true }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDataCard, { data, downloadable: true }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-data-card');
      expect(html).toContain('Ada Lovelace');
      expect(html).toContain('ada@example.com');
      expect(html).toContain('Download data');
      expect(html).toContain('data-filename="contact.vcf"');
    }
  });

  it('renders compact data through the ForgeCard base container', () => {
    const html = renderToStaticMarkup(createElement(ReactDataCard, { data, compact: true }));
    expect(html).toContain('forge-card');
    expect(html).toContain('Ada Lovelace');
  });

  it('renders a vCard and iCalendar union through ForgeCard', () => {
    const contact: VCardData = {
      type: 'vcard',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    };
    const event: ICalendarData = {
      type: 'icalendar',
      title: 'Mission briefing',
      start: '2026-08-24T10:00:00Z',
      end: '2026-08-24T11:00:00Z',
    };

    const contactHtml = renderToStaticMarkup(
      createElement(ReactDataCard, { data: contact, downloadable: true, compact: true }),
    );
    const eventHtml = renderToStaticMarkup(createElement(ReactDataCard, { data: event, downloadable: true }));

    expect(contactHtml).toContain('data-filename="contact.vcf"');
    expect(eventHtml).toContain('data-filename="event.ics"');
    expect(contactHtml).toContain('forge-card');
  });

  it('downloads valid vCard and iCalendar content', async () => {
    let downloaded: Blob | undefined;
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) => {
      downloaded = blob as Blob;
      return 'blob:forge-data-card';
    });
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        vueH(VueDataCard, {
          data: { type: 'vcard', name: 'Ada Lovelace' },
          downloadable: true,
        }),
    });
    app.mount(host);
    host.querySelector('button')?.click();
    await nextTick();

    assertDownloaded(downloaded);
    expect(await downloaded.text()).toContain('BEGIN:VCARD\r\n');
    app.unmount();
    host.remove();

    downloaded = undefined;
    const eventApp = createApp({
      render: () =>
        vueH(VueDataCard, {
          data: { type: 'icalendar', title: 'Briefing', start: '2026-08-24T10:00:00Z' },
          downloadable: true,
        }),
    });
    const eventHost = document.createElement('div');
    document.body.append(eventHost);
    eventApp.mount(eventHost);
    eventHost.querySelector('button')?.click();
    await nextTick();
    assertDownloaded(downloaded);
    expect(await (downloaded as unknown as Blob).text()).toContain('BEGIN:VEVENT\r\n');
    eventApp.unmount();
    eventHost.remove();
    createObjectUrl.mockRestore();
  });
});
