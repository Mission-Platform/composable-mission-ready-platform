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

  it('prefer-satisfies flags angle-bracket assertions with recommendation to use satisfies', async () => {
    const code = 'const x = <Config>{ a: 1 };\n';
    const [result] = await eslint.lintText(code, { filePath: 'test.ts' });
    assert.ok(result);
    const preferSatisfies = result.messages.find((m) => m.ruleId === '@typescript-eslint/prefer-satisfies');
    assert.ok(preferSatisfies, 'Expected @typescript-eslint/prefer-satisfies warning');
    assert.match(preferSatisfies.message, /Prefer "satisfies"/);
  });

  it('prefer-satisfies reports error on angle-bracket "<any>" assertion', async () => {
    const code = 'const x = <any>val;\n';
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

  it('no-unconstrained-generics flags unconstrained type parameters including extends unknown and extends any', async () => {
    const code = `
      function f1<T>(val: T): T { return val; }
      function f2<T extends unknown>(val: T): T { return val; }
      function f3<T extends any>(val: T): T { return val; }
    `;
    const [result] = await eslint.lintText(code, { filePath: 'test.ts' });
    assert.ok(result);
    const genericWarnings = result.messages.filter((m) => m.ruleId === '@typescript-eslint/no-unconstrained-generics');
    assert.equal(
      genericWarnings.length,
      3,
      'Expected 3 unconstrained generic warnings for T, T extends unknown, and T extends any',
    );
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

  it('no-implicit-unknown flags nested unknown in exported function return type such as Promise<unknown>', async () => {
    const code = `
      export async function fetchRaw(): Promise<unknown> { return "raw"; }
      export function parseInput(x: Promise<unknown>): string { return "ok"; }
      function internalHelper(): Promise<unknown> { return Promise.resolve(null); }
    `;
    const [result] = await eslint.lintText(code, { filePath: 'test.ts' });
    assert.ok(result);
    const unknownWarnings = result.messages.filter((m) => m.ruleId === '@typescript-eslint/no-implicit-unknown');
    assert.equal(unknownWarnings.length, 1, 'Expected only exported function return type to be reported');
  });

  it('no-implicit-unknown flags exported factories returning () => unknown', async () => {
    const code = 'export function createWorker(): () => unknown { return () => "raw"; }\n';
    const [result] = await eslint.lintText(code, { filePath: 'test.ts' });
    assert.ok(result);
    const unknownWarning = result.messages.find((m) => m.ruleId === '@typescript-eslint/no-implicit-unknown');
    assert.ok(
      unknownWarning,
      'Expected @typescript-eslint/no-implicit-unknown warning on factory returning () => unknown',
    );
  });

  it('unicorn/no-useless-undefined flags useless explicit undefined arguments', async () => {
    const code = 'function foo(a = undefined) { return undefined; }\nfoo(undefined);\n';
    const [result] = await eslint.lintText(code, { filePath: 'test.ts' });
    assert.ok(result);
    const uselessUndefined = result.messages.filter((m) => m.ruleId === 'unicorn/no-useless-undefined');
    assert.ok(uselessUndefined.length > 0, 'Expected unicorn/no-useless-undefined error');
  });

  it('import-x/order enforces ordering and classifies @mission-platform as internal', async () => {
    const badCode = [
      "import { localFn } from './local';",
      "import { coreFn } from '@mission-platform/core';",
      "import fs from 'node:fs';",
      '',
      'export { localFn, coreFn, fs };',
      '',
    ].join('\n');
    const [result] = await eslint.lintText(badCode, { filePath: 'test.ts' });
    assert.ok(result);
    const orderErrors = result.messages.filter((m) => m.ruleId === 'import-x/order');
    assert.ok(orderErrors.length > 0, 'Expected import-x/order errors for out-of-order imports');
  });

  it('compiler-safe-codegen flags eval, Function constructor, and vm execution', async () => {
    const dangerousCode = `
      eval("const a = 1;");
      const fn = new Function("x", "return x + 1");
      vm.runInContext(code, context);
      vm.runInNewContext(code);
    `;
    const [result] = await eslint.lintText(dangerousCode, {
      filePath: 'packages/compiler/plugins/forge-react/src/transformers/unsafe.ts',
    });
    assert.ok(result);
    const codegenErrors = result.messages.filter((m) => m.ruleId === '@typescript-eslint/compiler-safe-codegen');
    assert.equal(codegenErrors.length, 4, 'Expected 4 compiler-safe-codegen errors');
    assert.ok(codegenErrors.some((m) => m.message.includes('eval()')));
    assert.ok(codegenErrors.some((m) => m.message.includes('new Function()')));
    assert.ok(codegenErrors.some((m) => m.message.includes('vm execution')));
  });

  it('compiler-no-dynamic-imports flags dynamic non-literal import and require in compiler files', async () => {
    const dynamicCode = `
      const mod = await import(dynamicPath);
      const req = require(someVariable);
    `;
    const [result] = await eslint.lintText(dynamicCode, {
      filePath: 'packages/compiler/plugins/forge-vue/src/transformers/dynamic.ts',
    });
    assert.ok(result);
    const dynamicErrors = result.messages.filter((m) => m.ruleId === '@typescript-eslint/compiler-no-dynamic-imports');
    assert.equal(dynamicErrors.length, 2, 'Expected 2 compiler-no-dynamic-imports errors');
  });

  it('compiler security rules pass safe static imports and static AST constructs', async () => {
    const safeCode = `
      import path from 'node:path';
      import { quoteString, isIdentifierName } from './source-text.js';

      export function lower(name: string): string {
        return isIdentifierName(name) ? name : quoteString(name);
      }
    `;
    const [result] = await eslint.lintText(safeCode, {
      filePath: 'packages/compiler/plugins/forge-react/src/transformers/safe.ts',
    });
    assert.ok(result);
    const securityErrors = result.messages.filter(
      (m) =>
        m.ruleId === '@typescript-eslint/compiler-safe-codegen' ||
        m.ruleId === '@typescript-eslint/compiler-no-dynamic-imports',
    );
    assert.equal(securityErrors.length, 0, 'Did not expect compiler security errors in safe code');
  });
});
