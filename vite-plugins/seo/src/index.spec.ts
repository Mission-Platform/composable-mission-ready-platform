import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { seoPlugin } from '.';

import type { ResolvedConfig } from 'vite';

/** Minimal stub of the rollup plugin context used by `buildStart`. */
const pluginContext = {
  info: () => {
    /* no-op: the plugin context logger is unused in these tests */
  },
};

const runPlugin = (
  options: Parameters<typeof seoPlugin>[0],
  publicDirectory: string,
): { robots: string; sitemap: string } => {
  const plugin = seoPlugin(options);

  const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
  configResolved({ publicDir: publicDirectory, root: publicDirectory } as unknown as ResolvedConfig);

  const buildStart = plugin.buildStart as unknown as (this: typeof pluginContext) => void;
  buildStart.call(pluginContext);

  return {
    robots: readFileSync(path.join(publicDirectory, 'robots.txt'), 'utf8'),
    sitemap: readFileSync(path.join(publicDirectory, 'sitemap.xml'), 'utf8'),
  };
};

describe('seoPlugin', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'mp-seo-plugin-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('exposes the conventional plugin name', () => {
    expect(seoPlugin({ sitemap: { urls: [] } }).name).toBe('@mission-platform/vite-plugin-seo');
  });

  it('writes sitemap.xml and robots.txt into the resolved publicDir', () => {
    const { robots, sitemap } = runPlugin(
      {
        sitemap: { urls: [{ loc: 'https://example.com/' }] },
        robots: { groups: [{ userAgent: '*', allow: ['/'] }], sitemaps: ['https://example.com/sitemap.xml'] },
      },
      directory,
    );

    expect(sitemap).toContain('<loc>https://example.com/</loc>');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Sitemap: https://example.com/sitemap.xml');
  });

  it('emits a valid robots.txt when no robots policy is supplied', () => {
    const { robots } = runPlugin({ sitemap: { urls: [{ loc: 'https://example.com/' }] } }, directory);

    expect(robots).toContain('User-agent: *');
  });
});
