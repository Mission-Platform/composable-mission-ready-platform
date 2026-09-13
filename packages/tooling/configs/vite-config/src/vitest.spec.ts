import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { detectTestEnvironment, defineVitestConfig } from './vitest';

import { defineAppConfig, defineFrameworkAppConfig, defineWebComponentAppConfig } from './index';

describe('defineVitestConfig', () => {
  it('defaults testTimeout and hookTimeout to 30,000 ms', () => {
    const config = defineVitestConfig();
    expect(config.test?.testTimeout).toBe(30_000);
    expect(config.test?.hookTimeout).toBe(30_000);
  });

  it('allows overriding testTimeout and hookTimeout', () => {
    const config = defineVitestConfig({
      testTimeout: 45_000,
      hookTimeout: 15_000,
    });
    expect(config.test?.testTimeout).toBe(45_000);
    expect(config.test?.hookTimeout).toBe(15_000);
  });

  it('propagates timeouts into scoped framework test projects', () => {
    const config = defineVitestConfig({
      framework: 'vue',
      frameworkInclude: ['src/**/*.spec.ts'],
    });

    const projects = config.test?.projects as Array<{
      test?: { name?: string; testTimeout?: number; hookTimeout?: number; environment?: string };
    }>;
    expect(projects).toHaveLength(2);
    expect(projects[0].test?.name).toBe('neutral');
    expect(projects[0].test?.testTimeout).toBe(30_000);
    expect(projects[0].test?.hookTimeout).toBe(30_000);
    expect(projects[1].test?.name).toBe('mp:vue');
    expect(projects[1].test?.testTimeout).toBe(30_000);
    expect(projects[1].test?.hookTimeout).toBe(30_000);
  });

  it('supports happy-dom and node environments via options', () => {
    const happyDomConfig = defineVitestConfig({ environment: 'happy-dom' });
    expect(happyDomConfig.test?.environment).toBe('happy-dom');

    const nodeConfig = defineVitestConfig({ environment: 'node' });
    expect(nodeConfig.test?.environment).toBe('node');

    const jsdomConfig = defineVitestConfig({ environment: 'jsdom' });
    expect(jsdomConfig.test?.environment).toBe('jsdom');
  });

  it('detects test environment correctly', () => {
    const temporaryDirectory = path.resolve(import.meta.dirname, '../../../.test-tmp-env-' + Date.now());
    fs.mkdirSync(temporaryDirectory, { recursive: true });

    try {
      // 1. Explicit option overrides
      expect(detectTestEnvironment(temporaryDirectory, { environment: 'happy-dom' })).toBe('happy-dom');
      expect(detectTestEnvironment(temporaryDirectory, { environment: 'node' })).toBe('node');
      expect(detectTestEnvironment(temporaryDirectory, { environment: 'jsdom' })).toBe('jsdom');

      // 2. Overrides inside config object
      expect(detectTestEnvironment(temporaryDirectory, { overrides: { test: { environment: 'happy-dom' } } })).toBe(
        'happy-dom',
      );

      // 3. Package with happy-dom dependency (and no jsdom)
      fs.writeFileSync(
        path.join(temporaryDirectory, 'package.json'),
        JSON.stringify({
          devDependencies: {
            'happy-dom': '^15.0.0',
          },
        }),
      );
      expect(detectTestEnvironment(temporaryDirectory)).toBe('happy-dom');

      // 4. Package with jsdom dependency
      fs.writeFileSync(
        path.join(temporaryDirectory, 'package.json'),
        JSON.stringify({
          devDependencies: {
            jsdom: '^25.0.0',
          },
        }),
      );
      expect(detectTestEnvironment(temporaryDirectory)).toBe('jsdom');

      // 5. Pure node package (no DOM deps)
      fs.writeFileSync(
        path.join(temporaryDirectory, 'package.json'),
        JSON.stringify({
          dependencies: {
            zod: '^3.0.0',
          },
        }),
      );
      expect(detectTestEnvironment(temporaryDirectory)).toBe('node');
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});

describe('Sass Modern JS API in shared Vite configs', () => {
  it('configures modern-compiler api and quietDeps in defineAppConfig', () => {
    const config = defineAppConfig();
    const scss = (config.css?.preprocessorOptions as { scss?: { api?: string; quietDeps?: boolean } })?.scss;
    expect(scss?.api).toBe('modern-compiler');
    expect(scss?.quietDeps).toBe(true);
  });

  it('configures modern-compiler api and quietDeps in defineFrameworkAppConfig', () => {
    const config = defineFrameworkAppConfig('vue');
    const scss = (config.css?.preprocessorOptions as { scss?: { api?: string; quietDeps?: boolean } })?.scss;
    expect(scss?.api).toBe('modern-compiler');
    expect(scss?.quietDeps).toBe(true);
  });

  it('configures modern-compiler api and quietDeps in defineWebComponentAppConfig', () => {
    const config = defineWebComponentAppConfig();
    const scss = (config.css?.preprocessorOptions as { scss?: { api?: string; quietDeps?: boolean } })?.scss;
    expect(scss?.api).toBe('modern-compiler');
    expect(scss?.quietDeps).toBe(true);
  });
});
