import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ESLint } from 'eslint';

import baseConfig from './config.js';

describe('missionTypeScriptPlugin rules via ESLint flat config', () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: baseConfig,
  });

  it('prefer-satisfies flags type assertions with recommendation to use satisfies', async () => {
    const code = 'const x = { a: 1 } as Config;\n';
    const [result] = await eslint.lintText(code, { filePath: 'test.ts' });
    assert.ok(result);
    const preferSatisfies = result.messages.find((m) => m.ruleId === '@typescript-eslint/prefer-satisfies');
    assert.ok(preferSatisfies, 'Expected @typescript-eslint/prefer-satisfies warning');
    assert.match(preferSatisfies.message, /Prefer "satisfies"/);
  });

  it('prefer-satisfies reports error on "as any"', async () => {
    const code = 'const x = val as any;\n';
    const [result] = await eslint.lintText(code, { filePath: 'test.ts' });
    assert.ok(result);
    const noAsAny = result.messages.find(
      (m) => m.ruleId === '@typescript-eslint/prefer-satisfies' && m.message.includes('"as any"'),
    );
    assert.ok(noAsAny, 'Expected "as any" report');
  });

  it('prefer-satisfies passes "satisfies" and "as const"', async () => {
    const code = `
      interface Config { a: number }
      const x = { a: 1 } satisfies Config;
      const modes = ['light', 'dark'] as const;
    `;
    const [result] = await eslint.lintText(code, { filePath: 'test.ts' });
    assert.ok(result);
    const satisfiesWarning = result.messages.find((m) => m.ruleId === '@typescript-eslint/prefer-satisfies');
    assert.equal(satisfiesWarning, undefined, 'Did not expect prefer-satisfies warning on satisfies or as const');
  });

  it('no-unconstrained-generics flags unconstrained type parameters', async () => {
    const code = 'function identity<T>(val: T): T { return val; }\n';
    const [result] = await eslint.lintText(code, { filePath: 'test.ts' });
    assert.ok(result);
    const genericWarning = result.messages.find((m) => m.ruleId === '@typescript-eslint/no-unconstrained-generics');
    assert.ok(genericWarning, 'Expected @typescript-eslint/no-unconstrained-generics warning');
    assert.match(genericWarning.message, /must have an "extends" constraint/);
  });

  it('no-unconstrained-generics passes constrained generics', async () => {
    const code = `
      interface BaseItem { id: string }
      function identity<T extends BaseItem>(val: T): T { return val; }
    `;
    const [result] = await eslint.lintText(code, { filePath: 'test.ts' });
    assert.ok(result);
    const genericWarning = result.messages.find((m) => m.ruleId === '@typescript-eslint/no-unconstrained-generics');
    assert.equal(genericWarning, undefined, 'Did not expect unconstrained generic warning');
  });

  it('no-implicit-unknown flags exported functions returning unvalidated unknown', async () => {
    const code = 'export function getData(): unknown { return "raw"; }\n';
    const [result] = await eslint.lintText(code, { filePath: 'test.ts' });
    assert.ok(result);
    const unknownWarning = result.messages.find((m) => m.ruleId === '@typescript-eslint/no-implicit-unknown');
    assert.ok(unknownWarning, 'Expected @typescript-eslint/no-implicit-unknown warning');
  });
});
