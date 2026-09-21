import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const extensionRoot = path.resolve(import.meta.dirname, '..');

describe('Flint VS Code package', () => {
  it('declares the flint language, icon, and packaged server settings', async () => {
    const packageJson = JSON.parse(await readFile(path.join(extensionRoot, 'package.json'), 'utf8')) as {
      icon?: string;
      contributes: {
        languages: Array<{
          id: string;
          extensions: string[];
          icon?: { light: string; dark: string };
        }>;
        debuggers: Array<{
          type: string;
          languages: string[];
          configurationAttributes: { launch: { required: string[]; properties: Record<string, unknown> } };
          initialConfigurations: Array<Record<string, unknown>>;
        }>;
        breakpoints: Array<{ languageIds: string[] }>;
        configuration: { properties: Record<string, unknown> };
      };
    };
    const language = packageJson.contributes.languages.find(({ id }) => id === 'flint');
    expect(language).toEqual(
      expect.objectContaining({
        id: 'flint',
        extensions: ['.flint', '.flt'],
        icon: { light: './resources/flint.svg', dark: './resources/flint.svg' },
      }),
    );
    expect(packageJson.icon).toBe('./resources/flint.png');
    const icon = await readFile(path.join(extensionRoot, 'resources/flint.svg'), 'utf8');
    expect(icon).toMatch(/^<svg\s/u);
    await expect(readFile(path.join(extensionRoot, 'resources/flint.png'))).resolves.toBeTruthy();
    expect(packageJson.contributes.configuration.properties).toHaveProperty('flint.nodePath');
    expect(packageJson.contributes.configuration.properties).toHaveProperty('flint.serverPath');
    expect(packageJson.contributes.configuration.properties).toHaveProperty('flint.runtimePath');
    expect(packageJson.contributes.configuration.properties).toHaveProperty('flint.runtimeArgs');

    const debuggerContribution = packageJson.contributes.debuggers.find(({ type }) => type === 'flint');
    expect(debuggerContribution).toEqual(
      expect.objectContaining({
        type: 'flint',
        languages: ['flint'],
        configurationAttributes: {
          launch: expect.objectContaining({
            required: ['program'],
            properties: expect.objectContaining({ runtimePath: expect.any(Object), runtimeArgs: expect.any(Object) }),
          }),
        },
      }),
    );
    expect(debuggerContribution?.initialConfigurations).toContainEqual(
      expect.objectContaining({ type: 'flint', request: 'launch', program: '${file}' }), // skipcq: JS-0038
    );
    expect(packageJson.contributes.breakpoints).toContainEqual({ languageIds: ['flint'] });
  });
});
