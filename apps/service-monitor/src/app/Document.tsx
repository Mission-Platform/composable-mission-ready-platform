import { softwareApplication } from '@mission-platform/seo/json-ld';
import { buildPageMeta } from '@mission-platform/seo/meta';
import { createElement, type ReactNode } from 'react';

import styles from './styles.css?url';

/** App metadata driven through `@mission-platform/seo`'s framework-neutral builders. */
const APP_NAME = 'Service Monitor · Mission Platform';
const APP_DESCRIPTION = 'Server-side service monitoring dashboard with a live RxJS + D3 time-series view.';

const pageMeta = buildPageMeta({
  title: 'Service Monitor',
  titleTemplate: '%s · Mission Platform',
  description: APP_DESCRIPTION,
  applicationName: 'Service Monitor',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#0b0f19',
});

/** Schema.org JSON-LD describing the app, emitted as structured data. */
const jsonLd = softwareApplication({
  name: APP_NAME,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
});

/**
 * The HTML shell rendered on the server for every page. Its `<head>` is built
 * from `@mission-platform/seo` (page metadata + Schema.org JSON-LD). RedwoodSDK
 * streams the matched route's markup into `#root` and the inline import boots
 * the client bundle to hydrate any interactive (`"use client"`) components.
 */
export function Document({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{pageMeta.title ?? APP_NAME}</title>
        {pageMeta.metaTags.map((tag) =>
          createElement('meta', { key: `${tag.attr}`, [tag.key]: tag.attr, content: tag.content }),
        )}
        {pageMeta.linkTags.map((tag) => (
          <link
            key={`${tag.rel}-${tag.href}`}
            rel={tag.rel}
            href={tag.href}
            hrefLang={tag.hreflang}
          />
        ))}
        <link
          rel="icon"
          href="/favicon.svg"
          type="image/svg+xml"
        />
        <link
          rel="stylesheet"
          href={styles}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <div id="root">{children}</div>
        <script>import("/src/client.tsx")</script>
      </body>
    </html>
  );
}
