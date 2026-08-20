import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const extensionRoot = path.resolve(import.meta.dirname, '..');

describe('Forge Web Script VS Code package', () => {
  it('declares the fws language, icon, and packaged server settings', async () => {
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
    const language = packageJson.contributes.languages.find(({ id }) => id === 'fws');
    expect(language).toEqual(
      expect.objectContaining({
        id: 'fws',
        extensions: ['.fws'],
        icon: { light: './resources/fws.svg', dark: './resources/fws.svg' },
      }),
    );
    expect(packageJson.icon).toBe('./resources/fws.png');
    const icon = await readFile(path.join(extensionRoot, 'resources/fws.svg'), 'utf8');
    expect(icon).toMatch(/^<svg\s/u);
    await expect(readFile(path.join(extensionRoot, 'resources/fws.png'))).resolves.toBeTruthy();
    expect(packageJson.contributes.configuration.properties).toHaveProperty('forgeWebScript.nodePath');
    expect(packageJson.contributes.configuration.properties).toHaveProperty('forgeWebScript.serverPath');
    expect(packageJson.contributes.configuration.properties).toHaveProperty('forgeWebScript.runtimePath');
    expect(packageJson.contributes.configuration.properties).toHaveProperty('forgeWebScript.runtimeArgs');

    const debuggerContribution = packageJson.contributes.debuggers.find(({ type }) => type === 'fws');
    expect(debuggerContribution).toEqual(
      expect.objectContaining({
        type: 'fws',
        languages: ['fws'],
        configurationAttributes: {
          launch: expect.objectContaining({
            required: ['program'],
            properties: expect.objectContaining({ runtimePath: expect.any(Object), runtimeArgs: expect.any(Object) }),
          }),
        },
      }),
    );
    expect(debuggerContribution?.initialConfigurations).toContainEqual(
      expect.objectContaining({ type: 'fws', request: 'launch', program: '${file}' }),
    );
    expect(packageJson.contributes.breakpoints).toContainEqual({ languageIds: ['fws'] });
  });
});
