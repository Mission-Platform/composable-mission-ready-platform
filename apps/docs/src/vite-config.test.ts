import { describe, expect, it } from 'vitest';

import config from '../vite.config';

describe('documentation Vite configuration', () => {
  it('pre-bundles Mermaid before client-side diagram rendering', () => {
    expect(config.optimizeDeps?.include).toContain('mermaid');
  });
});
